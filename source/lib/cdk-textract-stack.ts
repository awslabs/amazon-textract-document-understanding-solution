  /**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import cdk = require("@aws-cdk/core");
import ddb = require("@aws-cdk/aws-dynamodb");
import es = require("@aws-cdk/aws-elasticsearch");
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import kms = require("@aws-cdk/aws-kms");
import s3 = require("@aws-cdk/aws-s3");
import s3deploy = require("@aws-cdk/aws-s3-deployment");
import sns = require("@aws-cdk/aws-sns");
import snsSubscriptions = require("@aws-cdk/aws-sns-subscriptions");
import sqs = require("@aws-cdk/aws-sqs");
import apigateway = require("@aws-cdk/aws-apigateway");
import ec2 = require("@aws-cdk/aws-ec2");
import {
  DynamoEventSource,
  SqsEventSource,
} from "@aws-cdk/aws-lambda-event-sources";
import {
  CfnUserPoolUser,
  CfnUserPoolClient,
  CfnUserPool,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
} from "@aws-cdk/aws-cognito";
import {
  CloudFrontWebDistribution,
  PriceClass,
  HttpVersion,
  OriginAccessIdentity,
} from "@aws-cdk/aws-cloudfront";
import { CanonicalUserPrincipal } from "@aws-cdk/aws-iam";
import uuid = require("short-uuid");
import { BucketEncryption, BlockPublicAccess } from "@aws-cdk/aws-s3";
import { QueueEncryption } from "@aws-cdk/aws-sqs";
import { LogGroup } from "@aws-cdk/aws-logs";
import { LogGroupLogDestination } from "@aws-cdk/aws-apigateway";
import * as s3n from "@aws-cdk/aws-s3-notifications";
import { CustomResource, Duration } from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Peer, Port } from "@aws-cdk/aws-ec2";

const API_CONCURRENT_REQUESTS = 30; //approximate number of 1-2 page documents to be processed parallelly

export interface TextractStackProps {
  email: string;
  isCICDDeploy: boolean;
  description: string;
  enableKendra: boolean;
  enableElasticsearch: boolean;
  enableComprehendMedical: boolean;
}

export class CdkTextractStack extends cdk.Stack {
  uuid: string;
  resourceName: (name: any) => string;
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(
    scope: cdk.Construct | undefined,
    id: string | undefined,
    props: TextractStackProps
  ) {
    super(scope, id, props);

    this.resourceName = (name: any) =>
      `${id}-${name}-${this.uuid}`.toLowerCase();

    this.uuid = uuid.generate();

    const corsRule = {
      allowedOrigins: ["*"],
      allowedMethods: [
        s3.HttpMethods.HEAD,
        s3.HttpMethods.GET,
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.DELETE,
      ],
      maxAge: 3000,
      exposedHeaders: ["ETag"],
      allowedHeaders: ["*"],
    };

    //validate that we have atleast 10 concurrent request for the API
    if (API_CONCURRENT_REQUESTS < 10) {
      throw Error(
        "Concurrency limit for Lambdas is too low. Please increase the value of API_CONCURRENT_REQUESTS"
      );
    }

    // S3 buckets
    const logsS3Bucket = new s3.Bucket(
      this,
      this.resourceName("LogsS3Bucket"),
      {
        accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    const documentsS3Bucket = new s3.Bucket(
      this,
      this.resourceName("DocumentsS3Bucket"),
      {
        versioned: false,
        cors: [corsRule],
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: logsS3Bucket,
        serverAccessLogsPrefix: "document-s3-bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    const samplesS3Bucket = new s3.Bucket(
      this,
      this.resourceName("SamplesS3Bucket"),
      {
        versioned: false,
        cors: [corsRule],
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: logsS3Bucket,
        serverAccessLogsPrefix: "sample-s3-bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    const bulkProcessingBucket = new s3.Bucket(
      this,
      this.resourceName("BulkProcessingBucket"),
      {
        versioned: false,
        cors: [corsRule],
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: logsS3Bucket,
        serverAccessLogsPrefix: "bulk-processing-s3-bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [
          {
            expiration: Duration.days(3),
          },
        ],
      }
    );
    // ### Client ###

    const clientAppS3Bucket = new s3.Bucket(
      this,
      this.resourceName("ClientAppS3Bucket"),
      {
        websiteIndexDocument: "index.html",
        cors: [corsRule],
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: logsS3Bucket,
        serverAccessLogsPrefix: "clientapps3bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    // eslint-disable-next-line no-unused-vars
    const oai = new OriginAccessIdentity(this, "cdk-textract-oai", {
      comment:
        "Origin Access Identity for Textract web stack bucket cloudfront distribution",
    });

    const distribution = new CloudFrontWebDistribution(
      this,
      "cdk-textract-cfront",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: clientAppS3Bucket,
              originAccessIdentity: oai,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            errorCachingMinTtl: 5,
            responsePagePath: "/index.html",
          },
        ],
        priceClass: PriceClass.PRICE_CLASS_100,
        httpVersion: HttpVersion.HTTP2,
        enableIpV6: true,
        defaultRootObject: "index.html",
        loggingConfig: {
          bucket: logsS3Bucket,
          prefix: "cloudfrontDistributionLogs",
          includeCookies: true,
        },
      }
    );

    const cloudfrontPolicyStatement = new iam.PolicyStatement({
      actions: ["s3:GetObject*", "s3:List*"],
      resources: [
        clientAppS3Bucket.bucketArn,
        `${clientAppS3Bucket.bucketArn}/*`,
      ],
      principals: [
        new CanonicalUserPrincipal(
          oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    });

    const cloudfrontSamplesBucketPolicyStatement = new iam.PolicyStatement({
      actions: ["s3:GetObject*", "s3:List*"],
      resources: [samplesS3Bucket.bucketArn, `${samplesS3Bucket.bucketArn}/*`],
      principals: [
        new CanonicalUserPrincipal(
          oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    });

    const cloudfrontDocumentsBucketPolicyStatement = new iam.PolicyStatement({
      actions: ["s3:GetObject*", "s3:List*", "s3:PutObject"],
      resources: [
        documentsS3Bucket.bucketArn,
        `${documentsS3Bucket.bucketArn}/*`,
      ],
      principals: [
        new CanonicalUserPrincipal(
          oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
        ),
      ],
    });

    clientAppS3Bucket.addToResourcePolicy(cloudfrontPolicyStatement);
    samplesS3Bucket.addToResourcePolicy(cloudfrontSamplesBucketPolicyStatement);
    documentsS3Bucket.addToResourcePolicy(
      cloudfrontDocumentsBucketPolicyStatement
    );

    let elasticSearch : es.CfnDomain;
    let vpc : ec2.Vpc;
    let esEncryptionKey : kms.Key;
    let esPolicy : iam.PolicyStatement;

    if (props.enableElasticsearch){

      /****                      VPC Configuration                         ****/
      vpc = new ec2.Vpc(this, this.resourceName('ElasticSearchVPC'), {
        cidr: "172.62.0.0/16"
      })

      const subnetIds = vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE}).subnetIds;

      const securityGroup = new ec2.SecurityGroup(this, this.resourceName('ESSecurityGroup'), {
        allowAllOutbound: true,
        vpc: vpc,
        securityGroupName: "Elasticsearch from lambda"
      })

      securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic(), "allow lambda ingress", false)

      const esSearchLogGroup = new LogGroup(
        this,
        this.resourceName("ElasticSearchSearchLogGroup"),
        {
          logGroupName: this.resourceName("ElasticSearchSearchLogGroup"),
        }
      );

      /****                      ES Resources                        ****/
      
      const esIndexLogGroup = new LogGroup(
        this,
        this.resourceName("ElasticSearchIndexLogGroup"),
        {
          logGroupName: this.resourceName("ElasticSearchIndexLogGroup"),
        }
      );

      esEncryptionKey = new kms.Key(this, "esEncryptionKey", {
        enableKeyRotation: true,
      });

      if (!props.isCICDDeploy) {
        elasticSearch = new es.CfnDomain(
          this,
          this.resourceName("ElasticSearchCluster"),
          {
            elasticsearchVersion: "7.4",
            elasticsearchClusterConfig: {
              instanceType: "m5.large.elasticsearch",
            },
            ebsOptions: {
              ebsEnabled: true,
              volumeSize: 20,
              volumeType: "gp2",
            },
            encryptionAtRestOptions: {
              enabled: true,
              kmsKeyId: esEncryptionKey.keyId,
            },
            nodeToNodeEncryptionOptions: {
              enabled: true,
            },
          }
        );
      } else {
        elasticSearch = new es.CfnDomain(
          this,
          this.resourceName("ElasticSearchCluster"),
          {
            elasticsearchVersion: "7.4",
            elasticsearchClusterConfig: {
              instanceType: "m5.large.elasticsearch",
              instanceCount: 2,
              dedicatedMasterEnabled: true,
              zoneAwarenessEnabled: true,
              zoneAwarenessConfig: {
                availabilityZoneCount: 2,
              },
            },
            ebsOptions: {
              ebsEnabled: true,
              volumeSize: 20,
              volumeType: "gp2",
            },
            encryptionAtRestOptions: {
              enabled: true,
              kmsKeyId: esEncryptionKey.keyId,
            },
            nodeToNodeEncryptionOptions: {
              enabled: true,
            },
            vpcOptions: {
              subnetIds: [subnetIds[0], subnetIds[1]],
              securityGroupIds: [securityGroup.securityGroupId]
            }
          }
        );
      }
      esPolicy  =new iam.PolicyStatement({
        actions: [
          "es:ESHttpHead",
          "es:Get*",
          "es:List*",
          "es:Describe*",
          "es:ESHttpGet",
          "es:ESHttpDelete",
          "es:ESHttpPost",
          "es:ESHttpPut",
        ],
        resources: [`${elasticSearch.attrArn}/*`],
      })
     
    }
    const jobResultsKey = new kms.Key(
      this,
      this.resourceName("JobResultsKey"),
      {
        enableKeyRotation: true,
        enabled: true,
        trustAccountIdentities: true,
        policy: new iam.PolicyDocument({
          assignSids: true,
          statements: [
            new iam.PolicyStatement({
              actions: ["kms:GenerateDataKey*", "kms:Decrypt"],
              resources: ["*"], // Resource level permissions are not necessary in this policy statement, as it is automatically restricted to this key
              effect: iam.Effect.ALLOW,
              principals: [
                new iam.ServicePrincipal("sns.amazonaws.com"),
                new iam.ServicePrincipal("lambda.amazonaws.com"),
                new iam.ServicePrincipal("textract.amazonaws.com"),
                new iam.ServicePrincipal("sqs.amazonaws.com"),
              ],
            }),
          ],
        }),
      }
    );

    // SNS Topic
    const jobCompletionTopic = new sns.Topic(
      this,
      this.resourceName("JobCompletionTopic"),
      {
        displayName: "Job completion topic",
        masterKey: jobResultsKey,
      }
    );

    // Textract service IAM role
    const textractServiceRole = new iam.Role(
      this,
      this.resourceName("TextractServiceRole"),
      {
        assumedBy: new iam.ServicePrincipal("textract.amazonaws.com"),
      }
    );

    textractServiceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sns:Publish"],
        resources: [jobCompletionTopic.topicArn],
      })
    );
    textractServiceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey*"],
        resources: [jobResultsKey.keyArn],
      })
    );

    // DynamoDB tables
    const outputTable = new ddb.Table(this, this.resourceName("OutputTable"), {
      partitionKey: { name: "documentId", type: ddb.AttributeType.STRING },
      sortKey: { name: "outputType", type: ddb.AttributeType.STRING },
      serverSideEncryption: true,
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });

    const documentsTable = new ddb.Table(
      this,
      this.resourceName("DocumentsTable"),
      {
        partitionKey: { name: "documentId", type: ddb.AttributeType.STRING },
        stream: ddb.StreamViewType.NEW_IMAGE,
        serverSideEncryption: true,
        billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      }
    );

    // SQS queues

    const documentBulkProcessingDLQueue = new sqs.Queue(
      this,
      this.resourceName("BulkProcessorJobsDLQ"),
      {
        visibilityTimeout: cdk.Duration.seconds(120),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const bulkProcessingKey = new kms.Key(
      this,
      this.resourceName("bulkProcessorKey"),
      {
        enableKeyRotation: true,
      }
    );
    bulkProcessingKey.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["kms:GenerateDataKey", "kms:Decrypt"],
        resources: [`*`],
        principals: [new iam.ServicePrincipal("s3.amazonaws.com")],
      })
    );
    const documentBulkProcessingQueue = new sqs.Queue(
      this,
      this.resourceName("DocumentBulkProcessingQueue"),
      {
        visibilityTimeout: cdk.Duration.seconds(600),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
        encryptionMasterKey: bulkProcessingKey,
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: documentBulkProcessingDLQueue,
        },
      }
    );
    documentBulkProcessingQueue.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes",
        ],
        resources: [`*`],
        principals: [
          new iam.AccountPrincipal(this.account),
          new iam.ServicePrincipal("s3.amazonaws.com"),
        ],
      })
    );

    const syncJobsDLQueue = new sqs.Queue(
      this,
      this.resourceName("SyncJobsDLQ"),
      {
        visibilityTimeout: cdk.Duration.seconds(120),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const syncJobsQueue = new sqs.Queue(this, this.resourceName("SyncJobs"), {
      visibilityTimeout: cdk.Duration.seconds(900),
      retentionPeriod: cdk.Duration.seconds(1209600),
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: syncJobsDLQueue,
      },
    });

    const asyncJobsDLQueue = new sqs.Queue(
      this,
      this.resourceName("AsyncJobsDLQ"),
      {
        visibilityTimeout: cdk.Duration.seconds(120),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const asyncJobsQueue = new sqs.Queue(this, this.resourceName("AsyncJobs"), {
      visibilityTimeout: cdk.Duration.seconds(120),
      retentionPeriod: cdk.Duration.seconds(1209600),
      encryption: QueueEncryption.KMS_MANAGED,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: asyncJobsDLQueue,
      },
    });

    const jobErrorHandlerDLQueue = new sqs.Queue(
      this,
      this.resourceName("jobErrorHandlerDLQ"),
      {
        visibilityTimeout: cdk.Duration.seconds(60),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const jobErrorHandlerQueue = new sqs.Queue(
      this,
      this.resourceName("jobErrorHandler"),
      {
        visibilityTimeout: cdk.Duration.seconds(60),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: jobErrorHandlerDLQueue,
        },
      }
    );

    const jobResultsDLQueue = new sqs.Queue(
      this,
      this.resourceName("JobResultsDLQ"),
      {
        visibilityTimeout: cdk.Duration.seconds(900),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const jobResultsQueue = new sqs.Queue(
      this,
      this.resourceName("JobResults"),
      {
        visibilityTimeout: cdk.Duration.seconds(900),
        retentionPeriod: cdk.Duration.seconds(1209600),
        encryption: QueueEncryption.KMS,
        encryptionMasterKey: jobResultsKey,
        dataKeyReuse: cdk.Duration.seconds(86400),
        deadLetterQueue: {
          maxReceiveCount: 3,
          queue: jobResultsDLQueue,
        },
      }
    );

    // trigger
    jobCompletionTopic.addSubscription(
      new snsSubscriptions.SqsSubscription(jobResultsQueue)
    );

    // ####### Cognito User Authentication #######

    const textractUserPool = new CfnUserPool(this, "textract-user-pool", {
      autoVerifiedAttributes: ["email"],
      aliasAttributes: ["email"],
      mfaConfiguration: "OFF",
      userPoolAddOns: {
        advancedSecurityMode: "ENFORCED",
      },
      policies: {
        passwordPolicy: {
          minimumLength: 8,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          requireUppercase: true,
        },
      },
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true,
        inviteMessageTemplate: {
          emailSubject: "Your DUS login",
          emailMessage: `<p>You are invited to try the Document Understanding Solution. Your credentials are:</p> \
                <p> \
                Username: <strong>{username}</strong><br /> \
                Password: <strong>{####}</strong> \
                </p> \
                <p>\
                Please wait until the deployent has completed for both DUS and DUSClient stacks before accessing the website \
                </p>\
                <p> \
                Please sign in with the user name and your temporary password provided above at: <br /> \
                https://${distribution.domainName} \
                </p>\
                `,
        },
        unusedAccountValidityDays: 7,
      },
    });

    new cdk.CfnOutput(this, 'DUSUserPoolId', { value: textractUserPool.ref });

    // Depends upon all other parts of the stack having been created.
    const textractUserPoolUser = new CfnUserPoolUser(
      this,
      "textract-user-pool-user",
      {
        desiredDeliveryMediums: ["EMAIL"],
        forceAliasCreation: false,
        userPoolId: textractUserPool.ref,
        userAttributes: [
          {
            name: "email",
            value: props.email,
          },
        ],
        username: props.email.replace(/@/, "."),
      }
    );

    const textractUserPoolClient = new CfnUserPoolClient(
      this,
      "textract-user-pool-client",
      {
        userPoolId: textractUserPool.ref,
      }
    );

    const textractIdentityPool = new CfnIdentityPool(
      this,
      "textract-identity-pool",
      {
        allowUnauthenticatedIdentities: false,
        cognitoIdentityProviders: [
          {
            clientId: textractUserPoolClient.ref,
            providerName: textractUserPool.attrProviderName,
            serverSideTokenCheck: false,
          },
        ],
      }
    );

    const textractCognitoAuthenticatedRole = new iam.Role(
      this,
      "textract-cognito-authenticated-role",
      {
        assumedBy: new iam.FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": textractIdentityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
        path: "/",
      }
    );

    const cognitoPolicy = new iam.Policy(this, "textract-cognito-policy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["cognito-identity:GetId"],
          resources: [
            `arn:aws:cognito-identity:${CdkTextractStack.of(this).region}:${
              CdkTextractStack.of(this).account
            }:identitypool/${textractIdentityPool.ref}`,
          ],
          effect: iam.Effect.ALLOW,
        }),
        new iam.PolicyStatement({
          actions: ["s3:GetObject*", "s3:List*"],
          resources: [
            samplesS3Bucket.bucketArn,
            `${samplesS3Bucket.bucketArn}/*`,
          ],
          effect: iam.Effect.ALLOW,
        }),
        new iam.PolicyStatement({
          actions: ["s3:GetObject*", "s3:List*", "s3:PutObject"],
          resources: [
            documentsS3Bucket.bucketArn,
            `${documentsS3Bucket.bucketArn}/*`,
          ],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    cognitoPolicy.attachToRole(textractCognitoAuthenticatedRole);

    const textractIdentityPoolRoleAttachment = new CfnIdentityPoolRoleAttachment(
      this,
      "textract-identity-role-pool-attachment",
      {
        identityPoolId: textractIdentityPool.ref,
        roles: {
          authenticated: textractCognitoAuthenticatedRole.roleArn,
        },
      }
    );

    /* ### Lambda ### */

    // If CICD deploy is used, the two largest lambdas draw their code from an S3 bucket.

    const cicdBotoLoc = lambda.Code.fromBucket(
      s3.Bucket.fromBucketName(this, "solutionBucketBoto", "SOURCE_BUCKET"),
      "SOLUTION_NAME/CODE_VERSION/boto3-layer.zip"
    );

    const cicdPDFLoc = lambda.Code.fromBucket(
      s3.Bucket.fromBucketName(this, "solutionBucketPDF", "SOURCE_BUCKET"),
      "SOLUTION_NAME/CODE_VERSION/searchable-pdf-1.0.jar"
    );

    // If a local yarn deploy is used, the two lambdas draw their code from a local directory.

    const yarnBotoLoc = lambda.Code.fromAsset("lambda/boto3/boto3-layer.zip");

    const yarnPDFLoc = lambda.Code.fromAsset("lambda/pdfgenerator");

    const helperLayer = new lambda.LayerVersion(
      this,
      this.resourceName("HelperLayer"),
      {
        code: lambda.Code.fromAsset("lambda/helper"),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
        license: "Apache-2.0",
      }
    );

    const textractorLayer = new lambda.LayerVersion(
      this,
      this.resourceName("Textractor"),
      {
        code: lambda.Code.fromAsset("lambda/textractor"),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
        license: "Apache-2.0",
      }
    );

    const boto3Layer = new lambda.LayerVersion(
      this,
      this.resourceName("Boto3"),
      {
        code: props.isCICDDeploy ? cicdBotoLoc : yarnBotoLoc,
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
        license: "Apache-2.0",
      }
    );

    const elasticSearchLayer = new lambda.LayerVersion(
      this,
      this.resourceName("ElasticSearchLayer"),
      {
        code: lambda.Code.fromAsset("lambda/elasticsearch/es.zip"),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_8],
        license: "Apache-2.0",
      }
    );

    // Lambdas

    const documentBulkProcessor = new lambda.Function(
      this,
      this.resourceName("DocumentBulkProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.fromAsset("lambda/documentbulkprocessor"),
        handler: "lambda_function.lambda_handler",
        reservedConcurrentExecutions: 1,
        timeout: cdk.Duration.seconds(300),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          DOCUMENTS_BUCKET: documentsS3Bucket.bucketName,
          OUTPUT_TABLE: outputTable.tableName,
          DOCUMENTS_TABLE: documentsTable.tableName,
        },
      }
    );
    documentBulkProcessor.addLayers(helperLayer);
    documentsTable.grantReadWriteData(documentBulkProcessor);
    outputTable.grantReadWriteData(documentBulkProcessor);
    documentsS3Bucket.grantReadWrite(documentBulkProcessor);
    bulkProcessingBucket.grantReadWrite(documentBulkProcessor);

    bulkProcessingBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.SqsDestination(documentBulkProcessingQueue),
      { prefix: "documentDrop/" }
    );
    bulkProcessingBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_COPY,
      new s3n.SqsDestination(documentBulkProcessingQueue),
      { prefix: "documentDrop/" }
    );

    documentBulkProcessor.addEventSource(
      new SqsEventSource(documentBulkProcessingQueue, {
        batchSize: 5,
      })
    );

    const documentProcessor = new lambda.Function(
      this,
      this.resourceName("TaskProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.fromAsset("lambda/documentprocessor"),
        handler: "lambda_function.lambda_handler",
        reservedConcurrentExecutions: API_CONCURRENT_REQUESTS,
        timeout: cdk.Duration.seconds(300),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          SYNC_QUEUE_URL: syncJobsQueue.queueUrl,
          ASYNC_QUEUE_URL: asyncJobsQueue.queueUrl,
          ERROR_HANDLER_QUEUE_URL: jobErrorHandlerQueue.queueUrl,
        },
        vpc: props.enableElasticsearch? vpc : null
      }
    );

    documentProcessor.addLayers(helperLayer);
    documentProcessor.addLayers(boto3Layer);

    //Trigger
    documentProcessor.addEventSource(
      new DynamoEventSource(documentsTable, {
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        batchSize: 1,
      })
    );

    //Permissions
    documentsTable.grantReadWriteData(documentProcessor);
    syncJobsQueue.grantSendMessages(documentProcessor);
    asyncJobsQueue.grantSendMessages(documentProcessor);
    jobErrorHandlerQueue.grantSendMessages(documentProcessor);
    documentsS3Bucket.grantRead(documentProcessor);
    samplesS3Bucket.grantRead(documentProcessor);
    //------------------------------------------------------------

    const jobErrorHandler = new lambda.Function(
      this,
      this.resourceName("JobErrorHandlerLambda"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.fromAsset("lambda/joberrorhandler"),
        reservedConcurrentExecutions: Math.floor(API_CONCURRENT_REQUESTS / 4),
        handler: "lambda_function.lambda_handler",
        timeout: cdk.Duration.seconds(60),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          DOCUMENTS_TABLE: documentsTable.tableName,
        },
      }
    );

    jobErrorHandler.addLayers(helperLayer);

    //Trigger
    jobErrorHandler.addEventSource(
      new SqsEventSource(jobErrorHandlerQueue, {
        batchSize: 1,
      })
    );

    //Permissions
    documentsTable.grantReadWriteData(jobErrorHandler);

    //------------------------------------------------------------
    // PDF Generator
    const pdfGenerator = new lambda.Function(
      this,
      this.resourceName("PdfGenerator"),
      {
        runtime: lambda.Runtime.JAVA_8,
        code: props.isCICDDeploy ? cicdPDFLoc : yarnPDFLoc,
        reservedConcurrentExecutions: API_CONCURRENT_REQUESTS,
        handler: "DemoLambdaV2::handleRequest",
        memorySize: 3000,
        timeout: cdk.Duration.seconds(900),
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    documentsS3Bucket.grantReadWrite(pdfGenerator);
    samplesS3Bucket.grantReadWrite(pdfGenerator);

    //------------------------------------------------------------

    // Sync Jobs Processor (Process jobs using sync APIs)
    const syncProcessor = new lambda.Function(
      this,
      this.resourceName("SyncProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.asset("lambda/syncprocessor"),
        handler: "lambda_function.lambda_handler",
        reservedConcurrentExecutions: Math.floor(API_CONCURRENT_REQUESTS / 3),
        timeout: cdk.Duration.seconds(900),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          OUTPUT_BUCKET: documentsS3Bucket.bucketName,
          OUTPUT_TABLE: outputTable.tableName,
          DOCUMENTS_TABLE: documentsTable.tableName,
          PDF_LAMBDA: pdfGenerator.functionName,
          ENABLE_COMPREHEND_MEDICAL: props.enableComprehendMedical.toString(),
        },
        vpc: props.enableElasticsearch? vpc : null
      }
    );

    //Layer
    syncProcessor.addLayers(helperLayer);
    syncProcessor.addLayers(textractorLayer);
    syncProcessor.addLayers(boto3Layer);
    syncProcessor.addLayers(elasticSearchLayer);

    //Trigger
    syncProcessor.addEventSource(
      new SqsEventSource(syncJobsQueue, {
        batchSize: 1,
      })
    );

    //Permissions
    documentsS3Bucket.grantReadWrite(syncProcessor);
    samplesS3Bucket.grantReadWrite(syncProcessor);
    outputTable.grantReadWriteData(syncProcessor);
    documentsTable.grantReadWriteData(syncProcessor);
    
    //------------------------------------------------------------

    // Async Job Processor (Start jobs using Async APIs)
    const asyncProcessor = new lambda.Function(
      this,
      this.resourceName("ASyncProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.asset("lambda/asyncprocessor"),
        handler: "lambda_function.lambda_handler",
        reservedConcurrentExecutions: Math.floor(API_CONCURRENT_REQUESTS / 3),
        timeout: cdk.Duration.seconds(120),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          ASYNC_QUEUE_URL: asyncJobsQueue.queueUrl,
          SNS_TOPIC_ARN: jobCompletionTopic.topicArn,
          SNS_ROLE_ARN: textractServiceRole.roleArn,
        },
        vpc: props.enableElasticsearch ? vpc : null, 
      }
    );

    //Layer
    asyncProcessor.addLayers(helperLayer);
    asyncProcessor.addLayers(boto3Layer);

    asyncProcessor.addEventSource(
      new SqsEventSource(asyncJobsQueue, {
        batchSize: 1,
      })
    );

    // Permissions
    documentsS3Bucket.grantRead(asyncProcessor);
    samplesS3Bucket.grantRead(asyncProcessor);
    asyncJobsQueue.grantConsumeMessages(asyncProcessor);
    asyncProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["iam:PassRole"],
        resources: [textractServiceRole.roleArn],
      })
    );

    //------------------------------------------------------------

    // Async Jobs Results Processor
    const jobResultProcessor = new lambda.Function(
      this,
      this.resourceName("JobResultProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.asset("lambda/jobresultprocessor"),
        handler: "lambda_function.lambda_handler",
        memorySize: 2000,
        reservedConcurrentExecutions: Math.floor(API_CONCURRENT_REQUESTS / 3),
        timeout: cdk.Duration.seconds(900),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          OUTPUT_BUCKET: documentsS3Bucket.bucketName,
          OUTPUT_TABLE: outputTable.tableName,
          DOCUMENTS_TABLE: documentsTable.tableName,
          PDF_LAMBDA: pdfGenerator.functionName,
          ENABLE_COMPREHEND_MEDICAL: props.enableComprehendMedical.toString(),
        },
        vpc: props.enableElasticsearch ? vpc : null,
      }
    );

    // Layer
    jobResultProcessor.addLayers(helperLayer);
    jobResultProcessor.addLayers(textractorLayer);
    jobResultProcessor.addLayers(boto3Layer);
    jobResultProcessor.addLayers(elasticSearchLayer);
    jobResultsKey.grantEncryptDecrypt(jobResultProcessor);

    // Triggers
    jobResultProcessor.addEventSource(
      new SqsEventSource(jobResultsQueue, {
        batchSize: 1,
      })
    );

    // Permissions
    outputTable.grantReadWriteData(jobResultProcessor);
    documentsTable.grantReadWriteData(jobResultProcessor);
    documentsS3Bucket.grantReadWrite(jobResultProcessor);
    samplesS3Bucket.grantReadWrite(jobResultProcessor);

    //------------------------------------------------------------

    pdfGenerator.grantInvoke(syncProcessor);
    pdfGenerator.grantInvoke(jobResultProcessor);

    const textractSyncPolicy = new iam.Policy(this, "textractSyncPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: ["textract:DetectDocumentText", "textract:AnalyzeDocument"],
          resources: ["*"], // Currently, Textract does not support resource level permissions https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazontextract.html#amazontextract-resources-for-iam-policies
        }),
      ],
      roles: [syncProcessor.role],
    });

    const textractAsyncPolicy = new iam.Policy(this, "textractAsyncPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "textract:StartDocumentTextDetection",
            "textract:StartDocumentAnalysis",
          ],
          resources: ["*"], // Currently, Textract does not support resource level permissions https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazontextract.html#amazontextract-resources-for-iam-policies
        }),
      ],
      roles: [asyncProcessor.role],
    });

    const textractJobResultsPolicy = new iam.Policy(
      this,
      "textractJobResultsPolicy",
      {
        statements: [
          new iam.PolicyStatement({
            actions: [
              "textract:GetDocumentTextDetection",
              "textract:GetDocumentAnalysis",
            ],
            resources: ["*"], // Currently, Textract does not support resource level permissions https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazontextract.html#amazontextract-resources-for-iam-policies
          }),
        ],
        roles: [jobResultProcessor.role],
      }
    );

    const comprehendPolicy = new iam.Policy(this, "comprehendPolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "comprehend:BatchDetectEntities",
            "comprehend:DetectEntities",
          ],
          resources: ["*"], // Currently, Comprehend does not support resource level permissionshttps://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazontextract.html#amazontextract-resources-for-iam-policies
        }),
      ],
      roles: [syncProcessor.role, jobResultProcessor.role],
    });

    if(props.enableComprehendMedical){
      const comprehendMedicalPolicy = new iam.Policy(
        this,
        "comprehendMedicalPolicy",
        {
          statements: [
            new iam.PolicyStatement({
              actions: [
                "comprehendmedical:InferICD10CM",
                "comprehendmedical:DetectEntitiesV2",
              ],
              resources: ["*"], // Currently, ComprehendMedical does not support resource level permissionshttps://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazontextract.html#amazontextract-resources-for-iam-policies
            }),
          ],
          roles: [syncProcessor.role, jobResultProcessor.role],
        }
      );
        const cfncomprehendMedicalPolicy = comprehendMedicalPolicy.node
        .defaultChild as iam.CfnPolicy;
      cfncomprehendMedicalPolicy.cfnOptions.metadata = {
        cfn_nag: {
          rules_to_suppress: [
            {
              id: "W12",
              reason:
                "Currently, some AI services does not support resource level permissions",
            },
          ],
        },
      };
    }

    //------------------------------------------------------------

    // API Processor
    const apiProcessor = new lambda.Function(
      this,
      this.resourceName("ApiProcessor"),
      {
        runtime: lambda.Runtime.PYTHON_3_8,
        code: lambda.Code.asset("lambda/apiprocessor"),
        handler: "lambda_function.lambda_handler",
        reservedConcurrentExecutions: API_CONCURRENT_REQUESTS,
        timeout: cdk.Duration.seconds(60),
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          CONTENT_BUCKET: documentsS3Bucket.bucketName,
          SAMPLE_BUCKET: samplesS3Bucket.bucketName,
          OUTPUT_TABLE: outputTable.tableName,
          DOCUMENTS_TABLE: documentsTable.tableName,
        },
        vpc: props.enableElasticsearch ? vpc : null,
      }
    );

    // Layer
    apiProcessor.addLayers(elasticSearchLayer);
    apiProcessor.addLayers(helperLayer);

    // Permissions
    documentsTable.grantReadWriteData(apiProcessor);
    documentsTable.grant(apiProcessor, "dynamodb:DescribeTable");
    outputTable.grantReadWriteData(apiProcessor);
    documentsS3Bucket.grantReadWrite(apiProcessor);
    samplesS3Bucket.grantRead(apiProcessor);
    // API

    // Log group for API logs
    const DUSApiLogGroup = new LogGroup(
      this,
      this.resourceName("DUSApiLogGroup"),
      {
        logGroupName: this.resourceName("DUSApiLogGroup"),
      }
    );

    const api = new apigateway.LambdaRestApi(
      this,
      this.resourceName("DUSAPI"),
      {
        handler: apiProcessor,
        proxy: false,
        deployOptions: {
          loggingLevel: apigateway.MethodLoggingLevel.INFO,
          dataTraceEnabled: false,
          accessLogDestination: new LogGroupLogDestination(DUSApiLogGroup),
          accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        },
      }
    );

    const reqValidator = new apigateway.RequestValidator(
      this,
      this.resourceName("apigwResourceValidator"),
      {
        restApi: api,
        validateRequestBody: true,
        validateRequestParameters: true,
      }
    );

    const authorizer = new apigateway.CfnAuthorizer(this, "Authorizer", {
      identitySource: "method.request.header.Authorization",
      name: "Authorization",
      type: "COGNITO_USER_POOLS",
      providerArns: [textractUserPool.attrArn],
      restApiId: api.restApiId,
    });

    function addCorsOptionsAndMethods(
      apiResource: apigateway.IResource | apigateway.Resource,
      methods: string[] | []
    ) {
      const options = apiResource.addMethod(
        "OPTIONS",
        new apigateway.MockIntegration({
          integrationResponses: [
            {
              statusCode: "200",
              responseParameters: {
                "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
                "method.response.header.Access-Control-Allow-Origin": "'*'",
                "method.response.header.Access-Control-Allow-Credentials":
                  "'false'",
                "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE'",
              },
            },
          ],
          passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
          requestTemplates: {
            "application/json": '{"statusCode": 200}',
          },
        }),
        {
          methodResponses: [
            {
              statusCode: "200",
              responseParameters: {
                "method.response.header.Access-Control-Allow-Headers": true,
                "method.response.header.Access-Control-Allow-Methods": true,
                "method.response.header.Access-Control-Allow-Credentials": true,
                "method.response.header.Access-Control-Allow-Origin": true,
              },
            },
          ],
          requestValidator: reqValidator,
        }
      );

      methods.forEach((method) => {
        apiResource.addMethod(method, undefined, {
          authorizationType: apigateway.AuthorizationType.COGNITO,
          authorizer: {
            authorizerId: `${authorizer.ref}`,
          },
        });
      });
    }

    addCorsOptionsAndMethods(api.root, []);

    const documentsResource = api.root.addResource("documents");
    addCorsOptionsAndMethods(documentsResource, ["GET"]);

    const documentResource = api.root.addResource("document");
    addCorsOptionsAndMethods(documentResource, ["GET", "POST", "DELETE"]);

    const redactResource = api.root.addResource("redact");
    addCorsOptionsAndMethods(redactResource, ["GET", "POST"]);

    const redactionResource = api.root.addResource("redaction");
    addCorsOptionsAndMethods(redactionResource, ["GET", "POST"]);

    const redactionGlobalResource = api.root.addResource("redactionglobal");
    addCorsOptionsAndMethods(redactionGlobalResource, ["GET"]);

    cognitoPolicy.addStatements(
      new iam.PolicyStatement({
        actions: ["execute-api:Invoke"],
        resources: [api.arnForExecuteApi()],
        effect: iam.Effect.ALLOW,
      })
    );


    if (props.enableElasticsearch){
        //  -------  Adding Env Vars ------ //
        apiProcessor.addEnvironment("ES_DOMAIN", elasticSearch.attrDomainEndpoint);
        syncProcessor.addEnvironment("ES_DOMAIN", elasticSearch.attrDomainEndpoint);
        jobResultProcessor.addEnvironment("ES_DOMAIN", elasticSearch.attrDomainEndpoint);
            
        //  -------  Adding Permissions ------ //
        esEncryptionKey.grantEncryptDecrypt(syncProcessor);
        syncProcessor.addToRolePolicy(esPolicy);
        esEncryptionKey.grantEncryptDecrypt(jobResultProcessor); 
        jobResultProcessor.addToRolePolicy(esPolicy);
        esEncryptionKey.grantEncryptDecrypt(apiProcessor);
        apiProcessor.addToRolePolicy(esPolicy);

        //  -------  API  ------ //
        const searchResource = api.root.addResource("search");
        addCorsOptionsAndMethods(searchResource, ["GET"]);
    }
    // add kendra index id to lambda environment in case of DUS+Kendra mode
    if (props.enableKendra) {
      let kendraResources = this.createandGetKendraRelatedResources(
        boto3Layer,
        logsS3Bucket,
        documentsS3Bucket,
        samplesS3Bucket,
        bulkProcessingBucket
      );
      const kendraRoleArn = kendraResources["KENDRA_ROLE_ARN"];
      const kendraIndexId = kendraResources["KENDRA_INDEX_ID"];
      apiProcessor.addEnvironment("KENDRA_INDEX_ID", kendraIndexId);
      apiProcessor.addEnvironment("KENDRA_ROLE_ARN", kendraRoleArn);
      apiProcessor.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "kendra:BatchPutDocument",
            "kendra:SubmitFeedback",
            "kendra:BatchDeleteDocument",
            "kendra:Query",
          ],
          resources: [
            "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
          ],
        })
      );
      jobResultProcessor.addEnvironment("KENDRA_INDEX_ID", kendraIndexId);
      jobResultProcessor.addEnvironment("KENDRA_ROLE_ARN", kendraRoleArn);
      jobResultProcessor.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "kendra:BatchPutDocument",
            "kendra:SubmitFeedback",
            "kendra:BatchDeleteDocument",
            "kendra:Query",
          ],
          resources: [
            "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
          ],
        })
      );
      jobResultProcessor.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["iam:PassRole"],
          resources: [kendraRoleArn],
        })
      );
      syncProcessor.addEnvironment("KENDRA_INDEX_ID", kendraIndexId);
      syncProcessor.addEnvironment("KENDRA_ROLE_ARN", kendraRoleArn);
      syncProcessor.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "kendra:BatchPutDocument",
            "kendra:SubmitFeedback",
            "kendra:BatchDeleteDocument",
            "kendra:Query",
          ],
          resources: [
            "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
          ],
        })
      );
      syncProcessor.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["iam:PassRole"],
          resources: [kendraRoleArn],
        })
      );
      const feedbackKendraResource = api.root.addResource("feedbackkendra");
      addCorsOptionsAndMethods(feedbackKendraResource, ["POST"]);

      const searchKendraResource = api.root.addResource("searchkendra");
      addCorsOptionsAndMethods(searchKendraResource, ["POST"]);
    }

    /*** CFN NAG SUPPRESSIONS - These do not affect the functionality of the solution ***/

    const cfnBucket = logsS3Bucket.node.defaultChild as s3.CfnBucket;
    cfnBucket.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W51",
            reason: "Default usage plan can be used for this API",
          },
          {
            id: "W35",
            reason: "This is a logs bucket, no logging desired.",
          },
        ],
      },
    };

    textractUserPool.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "F78",
            reason: "MFA Configuration is not required for this solution",
          },
        ],
      },
    };

    const cognitoPolicyResource = cognitoPolicy.node.findChild(
      "Resource"
    ) as iam.CfnPolicy;
    cognitoPolicyResource.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W11",
            reason:
              "The resources in the policy are created/managed by this solution.",
          },
        ],
      },
    };

    const cfnTextractSyncPolicy = textractSyncPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnTextractSyncPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason:
              "Currently, some AI services does not support resource level permissions",
          },
        ],
      },
    };

    const cfnTextractAsyncPolicy = textractAsyncPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnTextractAsyncPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason:
              "Currently, some AI services does not support resource level permissions",
          },
        ],
      },
    };

    const cfnTextractJobResultsPolicy = textractJobResultsPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfnTextractJobResultsPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason:
              "Currently, some AI services does not support resource level permissions",
          },
        ],
      },
    };

    const cfncomprehendPolicy = comprehendPolicy.node
      .defaultChild as iam.CfnPolicy;
    cfncomprehendPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W12",
            reason:
              "Currently, some AI services does not support resource level permissions",
          },
        ],
      },
    };

    const apiStage = api.deploymentStage;
    const cfnStage = apiStage.node.defaultChild as apigateway.CfnStage;
    cfnStage.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: "W64",
            reason: "No usage plan intended",
          },
        ],
      },
    };

    const apiDeployment = api.latestDeployment;
    const cfnDeployment = apiDeployment.node
      .defaultChild as apigateway.CfnDeployment;
  }
  createandGetKendraRelatedResources(
    boto3Layer: lambda.LayerVersion,
    logsS3Bucket: s3.Bucket,
    documentsS3Bucket: s3.Bucket,
    samplesS3Bucket: s3.Bucket,
    bulkProcessingBucket: s3.Bucket
  ) {
    const medicalDataBucket = new s3.Bucket(
      this,
      this.resourceName("MedicalDataBucket"),
      {
        accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        versioned: false,
        encryption: BucketEncryption.S3_MANAGED,
        serverAccessLogsBucket: logsS3Bucket,
        serverAccessLogsPrefix: "medical-data-bucket",
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      }
    );

    new s3deploy.BucketDeployment(
      this,
      this.resourceName("MedicalDataDeployment"),
      {
        sources: [s3deploy.Source.asset("samples/KendraPdfs")],
        destinationBucket: medicalDataBucket,
      }
    );
    // Assets for Kendra Custom Resource
    const kendraKMSKey = new kms.Key(
      this,
      this.resourceName("KendraIndexEncryptionKey"),
      {
        enableKeyRotation: true,
      }
    );

    const kendraRole = new iam.Role(this, this.resourceName("DUSKendraRole"), {
      assumedBy: new iam.ServicePrincipal("kendra.amazonaws.com"),
    });

    kendraRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        principals: [new iam.ServicePrincipal("kendra.amazonaws.com")],
      })
    );

    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: { StringEquals: { "cloudwatch:namespace": "AWS/Kendra" } },
      })
    );

    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["logs:DescribeLogGroups"],
        resources: ["*"],
        conditions: { StringEquals: { "cloudwatch:namespace": "AWS/Kendra" } },
      })
    );

    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["logs:CreateLogGroup"],
        resources: [
          "arn:aws:logs:" +
            this.region +
            ":" +
            this.account +
            ":log-group:/aws/kendra/*",
        ],
      })
    );

    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:DescribeLogStreams",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          "arn:aws:logs:" +
            this.region +
            ":" +
            this.account +
            ":log-group:/aws/kendra/*:log-stream:*",
        ],
      })
    );

    kendraRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: [
          medicalDataBucket.bucketArn,
          `${medicalDataBucket.bucketArn}/*`,
          documentsS3Bucket.bucketArn,
          `${documentsS3Bucket.bucketArn}/*`,
          samplesS3Bucket.bucketArn,
          `${samplesS3Bucket.bucketArn}/*`,
        ],
      })
    );
    const onEventKendraIndexLambda = new lambda.Function(
      this,
      this.resourceName("OnEventKendraIndexHandler"),
      {
        code: lambda.Code.fromAsset("lambda/customResourceKendraIndex/"),
        description: "onEvent handler for creating Kendra index",
        runtime: lambda.Runtime.PYTHON_3_8,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        environment: {
          KENDRA_ROLE_ARN: kendraRole.roleArn,
          KMS_KEY_ID: kendraKMSKey.keyId,
          KENDRA_INDEX_CLIENT_TOKEN: this.uuid.toLowerCase(),
        },
      }
    );

    kendraKMSKey.grantEncryptDecrypt(onEventKendraIndexLambda);
    onEventKendraIndexLambda.addLayers(boto3Layer);

    onEventKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kendra:CreateIndex", "kendra:TagResource"], // CreateIndex operation requires to specify "*" in resources. Ref: https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazonkendra.html#amazonkendra-index
        resources: ["*"],
      })
    );
    onEventKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "kendra:DeleteIndex",
          "kendra:DescribeIndex",
          "kendra:UpdateIndex",
        ],
        resources: [
          "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
        ],
      })
    );
    onEventKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "kms:ListKeys",
          "kms:ListAliases",
          "kms:DescribeKey",
          "kms:CreateGrant",
        ],
        resources: [
          "arn:aws:kms:" +
            this.region +
            ":" +
            this.account +
            ":key/" +
            kendraKMSKey.keyId,
        ],
      })
    );

    onEventKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [kendraRole.roleArn],
      })
    );

    const isCompleteKendraIndexLambda = new lambda.Function(
      this,
      this.resourceName("isCompleteKendraIndexPoller"),
      {
        code: lambda.Code.fromAsset("lambda/kendraIndexPoller"),
        description: "isComplete handler to check for Kendra Index creation",
        runtime: lambda.Runtime.PYTHON_3_8,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
      }
    );

    isCompleteKendraIndexLambda.addLayers(boto3Layer);

    isCompleteKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kendra:DescribeIndex"],
        resources: [
          "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
        ],
      })
    );

    isCompleteKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kendra:ListIndices"], // ListIndices operation requires to list "*" in resources. https://docs.aws.amazon.com/IAM/latest/UserGuide/list_amazonkendra.html#amazonkendra-index
        resources: ["*"],
      })
    );

    isCompleteKendraIndexLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [kendraRole.roleArn],
      })
    );

    const kendraIndexProvider = new cr.Provider(
      this,
      this.resourceName("KendraIndexProvider"),
      {
        onEventHandler: onEventKendraIndexLambda,
        isCompleteHandler: isCompleteKendraIndexLambda,
        totalTimeout: Duration.hours(1),
        queryInterval: Duration.minutes(1),
      }
    );

    const kendraIndexCustomResource = new CustomResource(
      this,
      this.resourceName("kendraIndexCustomResource"),
      {
        serviceToken: kendraIndexProvider.serviceToken,
        properties: {
          kendraKMSKeyId: kendraKMSKey.keyId,
          KendraRoleArn: kendraRole.roleArn,
        },
      }
    );

    const onEventKendraDataSourceLambda = new lambda.Function(
      this,
      this.resourceName("OnEventDataSourceCreator"),
      {
        code: lambda.Code.fromAsset("lambda/customResourceKendraDataSource/"),
        description: "onEvent handler for creating Kendra data source",
        runtime: lambda.Runtime.PYTHON_3_8,
        handler: "lambda_function.lambda_handler",
        timeout: Duration.minutes(15),
        environment: {
          KENDRA_ROLE_ARN: kendraRole.roleArn,
          KMS_KEY_ID: kendraKMSKey.keyId,
          KENDRA_INDEX_ID: kendraIndexCustomResource
            .getAtt("KendraIndexId")
            .toString(),
          DATA_BUCKET_NAME: medicalDataBucket.bucketName,
          BULK_PROCESSING_BUCKET: bulkProcessingBucket.bucketName,
        },
      }
    );

    onEventKendraDataSourceLambda.addLayers(boto3Layer);
    kendraKMSKey.grantEncryptDecrypt(onEventKendraDataSourceLambda);
    bulkProcessingBucket.grantReadWrite(onEventKendraDataSourceLambda);
    medicalDataBucket.grantReadWrite(onEventKendraDataSourceLambda);

    onEventKendraDataSourceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "kendra:CreateDataSource",
          "kendra:StartDataSourceSyncJob",
          "kendra:TagResource",
          "kendra:CreateFaq",
        ],
        resources: [
          "arn:aws:kendra:" + this.region + ":" + this.account + ":index/*",
        ],
      })
    );

    onEventKendraDataSourceLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [kendraRole.roleArn],
      })
    );

    const kendraDataSourceProvider = new cr.Provider(
      this,
      this.resourceName("KendraDataSourceProvider"),
      {
        onEventHandler: onEventKendraDataSourceLambda,
      }
    );

    const kendraIndexId = kendraIndexCustomResource
      .getAtt("KendraIndexId")
      .toString();
    const kendraDataSourceCustomResource = new CustomResource(
      this,
      this.resourceName("kendraDataSourceCustomResource"),
      {
        serviceToken: kendraDataSourceProvider.serviceToken,
        properties: {
          KENDRA_INDEX_ID: kendraIndexId,
          KendraRoleArn: kendraRole.roleArn,
          DataBucketName: medicalDataBucket.bucketName,
        },
      }
    );
    return {
      KENDRA_ROLE_ARN: kendraRole.roleArn,
      KENDRA_INDEX_ID: kendraIndexId,
    };
  }
}

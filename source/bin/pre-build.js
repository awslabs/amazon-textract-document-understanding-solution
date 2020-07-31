
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

const fs = require("fs");
const aws = require("aws-sdk");
const _ = require("lodash");

const stackName = `${process.env.STACKNAME}Stack`;
const region = process.env.AWS_REGION;
aws.config.region = region;
const isROMode = process.env.isROMode;

// listStackResources needs to be called twice in order to get the full stack.
const listFullStack = (stackName, callback) => {
  const cf = new aws.CloudFormation();
  cf.listStackResources(
    {
      StackName: stackName,
    },
    (err, resp) => {
      if (err) {
        callback(err, resp);
      }

      cf.listStackResources(
        {
          StackName: stackName,
          NextToken: resp.NextToken,
        },
        (err, resp2) => {
          callback(
            err,
            _.union(resp.StackResourceSummaries, resp2.StackResourceSummaries)
          );
        }
      );
    }
  );
};

const GetResources = new Promise((resolve, reject) => {
  listFullStack(stackName, (err, resp) => {
    if (err) {
      reject(err);
    }
    const stackDescriptionObj = resp;

    const ResourceTypesEncodes = [
      {
        type: "AWS::Cognito::IdentityPool",
        key: "IdentityPoolId",
      },
      {
        type: "AWS::Cognito::UserPool",
        key: "UserPoolId",
      },
      {
        type: "AWS::S3::Bucket",
        key: "FileBucketName",
      },
      {
        type: "AWS::Cognito::UserPoolClient",
        key: "UserPoolClientId",
      },
      {
        type: "AWS::ApiGateway::RestApi",
        key: "APIGateway",
      },
      {
        type: "AWS::Lambda::Function",
        key: "PdfGenLambda",
      },
    ];
    const resources = stackDescriptionObj
      .filter((resource) => resource && resource.ResourceType)
      .map(({ PhysicalResourceId, ResourceType }) => ({
        PhysicalResourceId,
        ResourceType,
      }))
      .reduce((acc, { PhysicalResourceId, ResourceType }) => {
        const index = ResourceTypesEncodes.map(({ type }) => type).indexOf(
          ResourceType
        );
        if (index !== -1) {
          acc = {
            ...acc,
            [ResourceTypesEncodes.map(({ key }) => key)[
              index
            ]]: PhysicalResourceId,
          };
        }
        if (acc.UserPoolId && !acc.region) {
          acc = { ...acc, region: acc.UserPoolId.replace(/((?:_)(.*))/, "") };
        }
        return acc;
      }, {});

    resources.FileBucketName = stackDescriptionObj.find((x) =>
      /DocumentsS3Bucket/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;
    resources.BulkProcessingBucketName = stackDescriptionObj.find((x) =>
      /BulkProcessingBucket/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;
    resources.SampleBucketName = stackDescriptionObj.find((x) =>
      /SamplesS3Bucket/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;
    resources.ClientAppBucketName = stackDescriptionObj.find((x) =>
      /ClientAppS3Bucket/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;
    resources.CovidDataBucketName = stackDescriptionObj.find((x) =>
    /CovidDataBucket/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;
    resources.PdfGenLambda = stackDescriptionObj.find((x) =>
      /pdfgenerator/i.test(x.LogicalResourceId)
    ).PhysicalResourceId;

    resolve(resources);
  });
});

const setEnv = async () => {
  const data = await GetResources;
  const outputArray = [];
  Object.keys(data).forEach((key) => {
    outputArray.push(`${key}=${data[key]}`);
  });
  fs.writeFileSync(".env", outputArray.join("\n"));
  fs.appendFileSync(".env","\nisROMode="+isROMode);
};
setEnv();

#!/bin/bash

source .env

#STACK

AWS_REGION=$(jq -r '.stack.region' ./package.json)

echo "==update %%CLIENT_APP_BUCKET%% in stack with $2=="
replace="s/%%CLIENT_APP_BUCKET%%/$ClientAppBucketName/g"
sed -i -e $replace ./lib/cdk-textract-client-stack.js

if [ $SEARCH_MODE == "AMAZON_ES_ONLY" ] || [ $SEARCH_MODE == "AMAZON_ES_AND_KENDRA" ]
then
    echo "==update Amazon Elasticsearch Cluster ($ElasticSearchCluster) with log streams to Log Groups: $ElasticSearchSearchLogGroup and $ElasticSearchIndexLogGroup"
    INDEX_LOG_ARN=$(aws logs describe-log-groups --region $AWS_REGION --log-group-name $ElasticSearchIndexLogGroup | jq -r '.logGroups[0].arn')
    SEARCH_LOG_ARN=$(aws logs describe-log-groups --region $AWS_REGION --log-group-name $ElasticSearchSearchLogGroup | jq -r '.logGroups[0].arn')

    echo "==adding permissions to ES service role first for creating log stream"
    aws logs put-resource-policy --region $AWS_REGION --policy-name es-to-log-stream --policy-document '{ "Version": "2012-10-17", "Statement": [ { "Sid": "ElasticSearchLogsToCloudWatchLogs", "Effect": "Allow", "Principal": { "Service": [ "es.amazonaws.com" ] }, "Action":["logs:PutLogEvents", "logs:CreateLogStream", "logs:DeleteLogStream"], "Resource": "*" } ] }'

    echo "==Log Groups are $INDEX_LOG_ARN and $SEARCH_LOG_ARN"
    aws es update-elasticsearch-domain-config --region $AWS_REGION --domain-name $ElasticSearchCluster --log-publishing-options '{"INDEX_SLOW_LOGS": { "CloudWatchLogsLogGroupArn": "'"$INDEX_LOG_ARN"'", "Enabled": true }, "SEARCH_SLOW_LOGS": { "CloudWatchLogsLogGroupArn": "'"$SEARCH_LOG_ARN"'", "Enabled": true } }'
fi
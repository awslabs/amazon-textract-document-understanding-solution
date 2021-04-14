/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

"use strict";

const fs = require("fs");
const Logger = require("logger");
const { promisify } = require("util");
const path = require("path");
const url = require("url");
const https = require("https");
const execSync = require("child_process").execSync;
const admZip = require("adm-zip");

const readdir = promisify(fs.readdir);
const fsstat = promisify(fs.stat);

const AWS = require("aws-sdk");
const codecommit = new AWS.CodeCommit({
  apiVersion: "2015-04-13",
  region: process.env.AWS_REGION,
});
const cloudwatchLogs = new AWS.CloudWatchLogs({
  apiVersion: "2014-03-28",
});
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  Logger.log(
    Logger.levels.ROBUST,
    `Received event: ${JSON.stringify(event, null, 2)}`
  );

  // Handling Promise Rejection
  process.on("unhandledRejection", (error) => {
    throw error;
  });

  if (event.ResourceType === "Custom::CreateCommit") {
    /**
     * Create commit when the solution is created
     */

    // execSync("rm -rf /tmp/* && mkdir /tmp/document-understanding");

    if (event.RequestType === "Create") {
      try {
        Logger.log(
          Logger.levels.ROBUST,
          `${event.LogicalResourceId}:${event.RequestType}`
        );

        Logger.log(
          Logger.levels.ROBUST,
          "adding access permissions to Log Groups to Amazon ElasticSearch"
        );

        const _repo = process.env.CODECOMMIT_REPO;
        const s3Bucket = process.env.CODE_BUCKET;
        const s3Key = process.env.CODE_KEY;
        const codeSource = process.env.CODE_SOURCE;
        const s3params = {
          Bucket: s3Bucket,
          Key: `${s3Key}/${codeSource}`,
        };
        Logger.log(Logger.levels.ROBUST, "Creating write stream...");
        const file = fs.createWriteStream(
          "/tmp/document-understanding-solution.zip"
        );

        Logger.log(
          Logger.levels.ROBUST,
          `Getting objects from S3...${JSON.stringify(s3params)}`
        );

        let documentUnderstandingData = await s3.getObject(s3params).promise();
        Logger.log(
          Logger.levels.ROBUST,
          "S3 object retrieved, writing to file..."
        );
        fs.writeFileSync(
          "/tmp/document-understanding-solution.zip",
          documentUnderstandingData.Body
        );

        Logger.log(
          Logger.levels.ROBUST,
          "Executing commands, extracting zipped contents..."
        );

        execSync(
          "rm -rf /tmp/document-understanding && mkdir /tmp/document-understanding"
        );
        let zip = new admZip(`/tmp/${codeSource}`);
        zip.extractAllTo("/tmp/document-understanding", true);

        Logger.log(Logger.levels.ROBUST, "Awaiting data...");

        const data = await walk("/tmp/document-understanding");
        let i,
          j,
          temparray,
          chunk = 2;
        let parentCommitId = "";
        let codeCommitParams = {};
        for (i = 0, j = data.length; i < j; i += chunk) {
          Logger.log(
            Logger.levels.ROBUST,
            `parent commitId is: ${parentCommitId}, i = ${i}, j = ${j}`
          );
          temparray = data.slice(i, i + chunk);
          const filesList = [];
          Logger.log(
            Logger.levels.ROBUST,
            `Data length is: ${data.length} and temparray length is: ${temparray.length}`
          );
          for (let k = 0; k < temparray.length; k++) {
            const fileDetails = {
              filePath: temparray[k].split("document-understanding/")[1],
              fileContent: Buffer.from(fs.readFileSync(temparray[k])),
            };
            filesList.push(fileDetails);
          }
          if (!parentCommitId) {
            codeCommitParams = {
              branchName: "main" /* required */,
              repositoryName: _repo /* required */,
              putFiles: filesList,
              authorName: "document-understanding-pipeline",
              commitMessage: "initial commit for document understanding",
            };
          } else if (parentCommitId) {
            codeCommitParams = {
              branchName: "main" /* required */,
              repositoryName: _repo /* required */,
              parentCommitId: parentCommitId,
              putFiles: filesList,
              authorName: "document-understanding-pipeline",
              commitMessage:
                "initial commit for document understanding, adding more code artifacts",
            };
          }

          Logger.log(
            Logger.levels.ROBUST,
            `params: ${codeCommitParams.repositoryName} ${codeCommitParams.parentCommitId},\n File list created, creating codecommit...`
          );
          let resp;
          try {
            resp = await codecommit.createCommit(codeCommitParams).promise();

            Logger.log(
              Logger.levels.ROBUST,
              `Commit successful, resp is ${resp}`
            );

            parentCommitId = resp.commitId;
            // Avoiding throttling
            await new Promise((r) => setTimeout(r, 200));
          } catch (ex) {
            Logger.log(
              Logger.levels.ROBUST,
              `It failed, continuing, error is: ${ex}`
            );

            resp = "failed";
            // Avoiding throttling
            await new Promise((r) => setTimeout(r, 5000));
          }

          // parentCommitId = resp.commitId;
        }

        const _responseData = {
          Method: `${event.LogicalResourceId}:${event.RequestType} `,
        };

        await sendResponse(
          event,
          context.logStreamName,
          "SUCCESS",
          _responseData
        );
      } catch (err) {
        const _responseData = {
          Error: err,
        };
        await sendResponse(
          event,
          context.logStreamName,
          "FAILED",
          _responseData
        );
        throw new Error(err);
      }
    } else {
      let _responseData = {
        Method: `${event.LogicalResourceId}:${event.RequestType}`,
      };
      Logger.log(
        Logger.levels.ROBUST,
        `${event.LogicalResourceId}:${event.RequestType}`
      );

      await sendResponse(
        event,
        context.logStreamName,
        "SUCCESS",
        _responseData
      );
    }
  }

  if (event.ResourceType === "Custom::ManifestGenerator") {
    /**
     * Create commit with CDK manifest file
     */
    if (event.RequestType === "Create" || event.RequestType === "Update") {
      const manifest = {};
      manifest.default = {};
      manifest.default.sendAnonymousUsage =
        event.ResourceProperties.ANONYMOUS_METRICS === "true" ? true : false;
      manifest.default.version = event.ResourceProperties.VERSION;
      manifest.default.api =
        event.ResourceProperties.API === "true"
          ? { deploy: true }
          : { deploy: false };
      manifest.default.defender =
        event.ResourceProperties.DEFENDER === "true"
          ? { deploy: true }
          : { deploy: false };
      manifest.default.events =
        event.ResourceProperties.EVENT === "true"
          ? {
              deploy: true,
              env: {
                eventTopic: "documentUnderstanding/event",
              },
            }
          : {
              deploy: false,
            };
      manifest.default.jitr =
        event.ResourceProperties.JITR === "true"
          ? { deploy: true }
          : { deploy: false };
      manifest.default.ownerapp =
        event.ResourceProperties.WEB_APP === "true"
          ? { deploy: true }
          : { deploy: false };
      manifest.default.telemetry =
        event.ResourceProperties.TELEMETRY === "true"
          ? {
              deploy: true,
              env: {
                telemetryTopic: "documentUnderstanding/telemetry",
              },
            }
          : {
              deploy: false,
            };
      // get last commit on main
      try {
        const _data = await codecommit
          .getBranch({
            branchName: "main",
            repositoryName: process.env.CODECOMMIT_REPO,
          })
          .promise();
        const _parentCommitId = _data.branch.commitId;
        const _params = {
          branchName: "main",
          repositoryName: process.env.CODECOMMIT_REPO,
          fileContent: JSON.stringify(manifest, null, 2),
          filePath: "deployment/custom-deployment/cdk-manifest.json",
          name: "document-understanding-pipeline",
          parentCommitId: _parentCommitId,
        };
        Logger.log(
          Logger.levels.ROBUST,
          `params: ${JSON.stringify(_params, null, 2)}`
        );
        await codecommit.putFile(_params).promise();
      } catch (err) {
        const _responseData = {
          Error: err,
        };
        await sendResponse(
          event,
          context.logStreamName,
          "FAILED",
          _responseData
        );
        throw new Error(err);
      }

      const _responseData = {
        Method: `${event.LogicalResourceId}:${event.RequestType}`,
      };

      await sendResponse(
        event,
        context.logStreamName,
        "SUCCESS",
        _responseData
      );
    } else {
      let _responseData = {
        Method: `${event.LogicalResourceId}:${event.RequestType}`,
      };
      Logger.log(
        Logger.levels.ROBUST,
        `${event.LogicalResourceId}:${event.RequestType}`
      );

      await sendResponse(
        event,
        context.logStreamName,
        "SUCCESS",
        _responseData
      );
    }
  }
  if (event.ResourceType === "Custom::DeleteStack") {
    /**
     * Create commit with CDK manifest file
     */
    if (event.RequestType === "Delete") {
      const cloudformation = new AWS.CloudFormation({
        apiVersion: "2010-05-15",
      });
      try {
        await cloudformation
          .deleteStack({ StackName: event.ResourceProperties.STACK_NAME })
          .promise();
        await cloudformation
          .waitFor("stackDeleteComplete", {
            StackName: event.ResourceProperties.STACK_NAME,
          })
          .promise();
        await cloudformation
          .deleteStack({
            StackName: event.ResourceProperties.CLIENT_STACK_NAME,
          })
          .promise();
        await cloudformation
          .waitFor("stackDeleteComplete", {
            StackName: event.ResourceProperties.CLIENT_STACK_NAME,
          })
          .promise();
      } catch (err) {
        const _responseData = {
          Error: err,
        };
        await sendResponse(
          event,
          context.logStreamName,
          "FAILED",
          _responseData
        );
        throw new Error(err);
      }

      const _responseData = {
        Method: `${event.LogicalResourceId}:${event.RequestType}`,
      };

      await sendResponse(
        event,
        context.logStreamName,
        "SUCCESS",
        _responseData
      );
    } else {
      let _responseData = {
        Method: `${event.LogicalResourceId}:${event.RequestType}`,
      };
      Logger.log(
        Logger.levels.ROBUST,
        `${event.LogicalResourceId}:${event.RequestType}`
      );

      await sendResponse(
        event,
        context.logStreamName,
        "SUCCESS",
        _responseData
      );
    }
  }
};

const walk = async (dir, filelist = []) => {
  const files = await readdir(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = await fsstat(filepath);

    if (stat.isDirectory()) {
      filelist = await walk(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }

  return filelist;
};

/**
 * Sends a response to the pre-signed S3 URL
 */
const sendResponse = async (
  event,
  logStreamName,
  responseStatus,
  responseData
) => {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: `See the details in CloudWatch Log Stream: ${logStreamName} `,
    PhysicalResourceId: logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData,
  });

  Logger.log(Logger.levels.ROBUST, `RESPONSE BODY: ${responseBody}`);
  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk.toString()));
      res.on("error", reject);
      res.on("end", () => {
        Logger.log(
          Logger.levels.ROBUST,
          `SIGANL SENT STATUS: ${res.statusCode}`
        );
        Logger.log(
          Logger.levels.ROBUST,
          `HEADERS: ${JSON.stringify(res.headers)}`
        );
        if (res.statusCode >= 200 && res.statusCode <= 299) {
          Logger.log(Logger.levels.INFO, `Successfully sent stack response`);
          resolve({ statusCode: res.statusCode, headers: res.headers });
        } else {
          reject("Request failed status: " + res.statusCode);
        }
      });
    });
    req.on("error", reject);
    req.write(responseBody);
    req.end();
  });
};

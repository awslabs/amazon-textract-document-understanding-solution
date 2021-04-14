
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

const cdk = require("@aws-cdk/core");
const CdkTextractStack = require("../lib/cdk-textract-stack");
const readlineSync = require("readline-sync");
const fs = require("fs");

const app = new cdk.App();
const stackName = `${process.env.STACKNAME}Stack`;


const userEmail =
  process.env.USER_EMAIL == "%%USER_EMAIL%%"
    ? readlineSync.question("Please enter your email address: ")
    : process.env.USER_EMAIL;

if ( !["AMAZON_ES_ONLY","AMAZON_KENDRA_ONLY","AMAZON_ES_AND_KENDRA"].includes(process.env.SEARCH_MODE)){
  throw Error(
        "Invalid Search Mode provided :{} . Search Mode Values include : AMAZON_ES_ONLY , AMAZON_KENDRA_ONLY , AMAZON_ES_AND_KENDRA".format(process.env.SEARCH_MODE)
      );
  }
const enableKendra = (process.env.SEARCH_MODE == "AMAZON_KENDRA_ONLY" || process.env.SEARCH_MODE == "AMAZON_ES_AND_KENDRA")
const enableElasticsearch = (process.env.SEARCH_MODE == "AMAZON_ES_ONLY" || process.env.SEARCH_MODE == "AMAZON_ES_AND_KENDRA")? true : false;

const isCICDDeploy = process.env.ISCICD == "false" ? false : true;
const enableComprehendMedical = process.env.ENABLE_COMPREHEND_MEDICAL == "true"? true : false;
// // eslint-disable-next-line no-new
new CdkTextractStack.CdkTextractStack(app, stackName, {
  description : "MLSLD-S0001. Document Understanding Solution. This stack deploys the backend for DUS",
  email: userEmail,
  isCICDDeploy: isCICDDeploy,
  enableKendra: enableKendra,
  enableElasticsearch : enableElasticsearch,
  enableComprehendMedical: enableComprehendMedical
});

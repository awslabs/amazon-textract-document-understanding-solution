#!/bin/bash
source .env
aws s3 cp ./samples/ClassicMode/ s3://$SampleBucketName/public/samples/ --recursive
if [ $SEARCH_MODE == "AMAZON_KENDRA_ONLY" ] || [ $SEARCH_MODE == "AMAZON_ES_AND_KENDRA" ]
then
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/GeneralPublic/policy/  s3://$BulkProcessingBucketName/kendraPolicyDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/HealthcareProvider/policy/  s3://$BulkProcessingBucketName/kendraPolicyDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/Scientist/policy/  s3://$BulkProcessingBucketName/kendraPolicyDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/GeneralPublic/pdf/  s3://$BulkProcessingBucketName/documentDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/HealthcareProvider/pdf/  s3://$BulkProcessingBucketName/documentDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/PersonaSpecific/Scientist/pdf/  s3://$BulkProcessingBucketName/documentDrop/
    aws s3 sync s3://$MedicalDataBucketName/documents/GeneralDocuments/pdf/  s3://$BulkProcessingBucketName/documentDrop/
fi



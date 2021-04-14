# Change Log

All notable changes to this project will be documented in this file.

## [1.1.0] - 2021-03-02

### Updates

- Added ability to remove individual redactions on click
- Added ability to add redactions by clicking highlights
- Added PDF and PNG export options for whole redacted document
- Redactions and associated features now only show on compliance track
- Search bar on document page always shows now, rather than being based on which tab is active
- Comprehend medical is now opt-in at deployment
- User must now choose between ElasticSearch, Amazon Kendra, or both at deployment
- User Pool ID is now included in the CloudFormation stack output

### Bug fixes

- Fix document upload bug #151
- Show continue button only when all documents are successfully uploaded on upload page
- Fix scenario where more than one track can appear active on document page

### Maintenance

- Add gitignore
- Remove custom config for SCSS modules, using in-built version from Next
- Explicitly declare 404 page rather than letting the general error page apply to it
- Rename static folder to public
- Remove package-lock.json
- Update `aws-amplify` from 2.1.0 to 3.3.17, `next` from 10.0.3 to 10.0.6, `elliptic` from 6.5.3 to 6.5.4
- Remove `next-sass`

## [1.0.1] - 2021-01-04

### Changed

- Updated the command to install the package moto in README and deployment scripts
- Updated the version of the package ini from 1.3.5 to 1.3.8
- Modified package.json to install version 0.21.1 for axios which is a dependency of amplify

## [1.0.0] - 2020-10-30

### Added

- Initial Release

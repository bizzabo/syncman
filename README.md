# Syncman

A CLI tool that syncs an OAS file to Postman and generates a Postman collection from it

## Installation
In your terminal run:
```
npm i -g syncman
```

## Usage
Make sure you have the following env variables set up:
- `POSTMAN_API_KEY` - you can get it from here: https://<your-postman-subdomain>.postman.co/settings/me/api-keys
- `POSTMAN_WORKSPACE_ID` - your Postman Workspace id

You can do it by exporting them in your terminal:
```
export POSTMAN_API_KEY=<your key>
export POSTMAN_WORKSPACE_ID=<your postman workspace id>
```

Then run:
```
syncman --location <oas-file-location> --apiname "<api name>" --versionname "<version name>"
```

`versionname` is optional, and if not provided will be equal to `Latest`

## Local Development
To test it locally, run:
```
npm run sync -- --apiname "My Lovely Api" --location oas-test.yaml --versionname V1
```
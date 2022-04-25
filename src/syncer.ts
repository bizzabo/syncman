import * as fs from 'fs';
import * as chalk from 'chalk';
import { PostmanClient } from './postmansdk';
import * as promisify from 'util.promisify';
import { CollectionDefinition } from 'postman-collection';
const converter = require('openapi-to-postmanv2'); // eslint-disable-line @typescript-eslint/no-var-requires
const oasConvert = promisify(converter.convert);

export class Syncer {
  private apiName: string;
  private versionName: string;
  private oasContent: string;
  private PostmanSDK: PostmanClient;
  private collectionId?: string;

  constructor(apiName: string, oasLocation: string, versionName: string) {
    if (!process.env.POSTMAN_API_KEY) {
      console.error(
        chalk.red(
          `POSTMAN_API_KEY environmnent variable was not set, aborting`,
        ),
      );
      process.exit(2);
    }

    if (!process.env.POSTMAN_WORKSPACE_ID) {
      console.error(
        chalk.red(
          `POSTMAN_WORKSPACE_ID environmnent variable was not set, aborting`,
        ),
      );
      process.exit(2);
    }

    try {
      this.oasContent = fs.readFileSync(oasLocation, 'utf8');
    } catch (e) {
      console.error(
        chalk.red(`No valid OAS file located in "${oasLocation}", aborting`),
      );
      process.exit(2);
    }

    this.apiName = this.generatedName(apiName);
    this.versionName = versionName;

    const apiKey = `${process.env.POSTMAN_API_KEY}`;
    const postmanWorkspaceId = `${process.env.POSTMAN_WORKSPACE_ID}`;
    this.PostmanSDK = new PostmanClient(apiKey, postmanWorkspaceId);
  }

  async setup() {
    const workspace = await this.PostmanSDK.getWorkspace();
    if (!workspace) {
      throw new Error(
        `Workspace does not exist or you are not allowed to use it, aborting`,
      );
    }
  }

  async uploadOAS() {
    const apiId = await this.upsertApi();
    const apiVersionId = await this.upsertApiVersion(apiId);
    this.collectionId = await this.upsertSchemaAndGenerateDocCollection(
      apiId,
      apiVersionId,
    );
  }

  async updateCollection() {
    if (!this.collectionId) {
      throw new Error(
        `You must call uploadOAS before you call updateCollection`,
      );
    }

    const conversionResult = await oasConvert(
      { type: 'string', data: this.oasContent },
      {
        folderStrategy: 'Tags',
        schemaFaker: true,
        requestParametersResolution: 'Example',
      },
    );
    if (!conversionResult.result) {
      console.warn(
        chalk.yellow(
          'Could not convert, skipping collections update',
          conversionResult.reason,
        ),
      );
      process.exit(0);
    }

    const collectionContent = conversionResult.output[0]
      .data as CollectionDefinition;

    // set a proper name for the collection
    const collectionName = this.generatedName(collectionContent.info!.name!);
    const updatedInfo = { ...collectionContent.info, name: collectionName };
    const updatedCollectionContent = {
      ...collectionContent,
      info: updatedInfo,
    };

    await this.PostmanSDK.updateCollection(
      this.collectionId,
      updatedCollectionContent,
    );
  }

  /*** PRIVATE METHODS ***/

  private async upsertApi(): Promise<string> {
    const api =
      (await this.PostmanSDK.findApiByName(this.apiName)) ??
      (await this.PostmanSDK.createApi(this.apiName));
    return api.id;
  }

  private async upsertApiVersion(apiId: string): Promise<string> {
    const apiVersion =
      (await this.PostmanSDK.getApiVersionByName(apiId, this.versionName)) ??
      (await this.PostmanSDK.createApiVersion(apiId, this.versionName));
    return apiVersion.id;
  }

  private async upsertSchemaAndGenerateDocCollection(
    apiId: string,
    apiVersionId: string,
  ): Promise<string | undefined> {
    const apiVersionSchemaId = (
      await this.PostmanSDK.getApiVersionById(apiId, apiVersionId)
    )?.schema.pop();
    let schema;
    let relations;
    if (apiVersionSchemaId) {
      console.log('schema exists, updating');
      schema = await this.PostmanSDK.updateSchema(
        apiId,
        apiVersionId,
        apiVersionSchemaId,
        this.oasContent,
      );
      const collectionId = await this.PostmanSDK.getDocumentationCollectionId(
        apiId,
        apiVersionId,
      );
      if (!collectionId) {
        console.warn('Related collection does not exist, creating a new one');
        relations = await this.PostmanSDK.createCollectionFromSchema(
          apiId,
          apiVersionId,
          schema.id,
          this.generatedName(this.apiName),
        );
        return relations?.collection.id;
      }

      return collectionId!;
    } else {
      schema = await this.PostmanSDK.createSchema(
        apiId,
        apiVersionId,
        this.oasContent,
      );
      console.log('schema does not exist, creating');
      // only for the first time, create relations to collections
      relations = await this.PostmanSDK.createCollectionFromSchema(
        apiId,
        apiVersionId,
        schema.id,
        this.generatedName(this.apiName),
      );
    }
    return relations?.collection.id;
  }

  private generatedName = (name: string) => `${name} [Generated]`;
}

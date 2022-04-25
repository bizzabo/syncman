import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as ora from 'ora';
import * as chalk from 'chalk';
import { Readable } from 'stream';
import { CollectionDefinition } from 'postman-collection';
import {
  WorkspaceDetailResult,
  ApiResult,
  ApiVersionModel,
  ApiSchemaResult,
  SchemaCollectionResult,
} from './types';

enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PATCH = 'patch',
  PUT = 'put',
  DELETE = 'delete',
}

export class PostmanClient {
  private baseUrl: string;
  private apiKey: string;
  private postmanWorkspaceId: string;

  constructor(apiKey: string, postmanWorkspaceId: string) {
    this.baseUrl = 'https://api.getpostman.com';
    this.apiKey = apiKey;
    this.postmanWorkspaceId = postmanWorkspaceId;
  }

  async getWorkspace(): Promise<WorkspaceDetailResult | undefined> {
    return (await this.callPostmanApi(`/workspaces/${this.postmanWorkspaceId}`))
      ?.workspace;
  }

  async findApiByName(apiName: string): Promise<ApiResult | undefined> {
    const allApis = (await this.callPostmanApi('/apis'))?.apis;
    return allApis && allApis.find((api: ApiResult) => api.name === apiName);
  }

  async createApi(apiName: string): Promise<ApiResult> {
    const data = JSON.stringify({
      api: {
        name: apiName,
      },
    });
    const response = await this.callPostmanApi(
      `/apis?workspace=${this.postmanWorkspaceId}`,
      HttpMethod.POST,
      data,
    );
    return response.api;
  }

  async getApiVersionByName(
    apiId: string,
    versionName: string,
  ): Promise<ApiVersionModel | undefined> {
    const allApiVersions = (
      await this.callPostmanApi(`/apis/${apiId}/versions`)
    )?.versions;
    return (
      allApiVersions &&
      allApiVersions.find(
        (version: ApiVersionModel) => version.name === versionName,
      )
    );
  }

  async getApiVersionById(
    apiId: string,
    apiVersionId: string,
  ): Promise<ApiVersionModel | undefined> {
    return (
      await this.callPostmanApi(`/apis/${apiId}/versions/${apiVersionId}`)
    )?.version;
  }

  async createApiVersion(
    apiId: string,
    versionName: string,
  ): Promise<ApiVersionModel> {
    const data = JSON.stringify({
      version: {
        name: versionName,
      },
    });
    return (
      await this.callPostmanApi(
        `/apis/${apiId}/versions`,
        HttpMethod.POST,
        data,
      )
    )?.version;
  }

  async createSchema(
    apiId: string,
    apiVersionId: string,
    schema: string,
  ): Promise<ApiSchemaResult> {
    const data = JSON.stringify({
      schema: {
        language: 'yaml',
        schema: schema,
        type: 'openapi3',
      },
    });

    return (
      await this.callPostmanApi(
        `/apis/${apiId}/versions/${apiVersionId}/schemas`,
        HttpMethod.POST,
        data,
      )
    )?.schema;
  }

  async updateSchema(
    apiId: string,
    apiVersionId: string,
    schemaId: string,
    schema: any,
  ): Promise<ApiSchemaResult> {
    const data = JSON.stringify({
      schema: {
        language: 'yaml',
        schema: schema,
        type: 'openapi3',
      },
    });

    return (
      await this.callPostmanApi(
        `/apis/${apiId}/versions/${apiVersionId}/schemas/${schemaId}`,
        HttpMethod.PUT,
        data,
      )
    )?.schema;
  }

  async updateCollection(
    collectionId: string,
    collection: CollectionDefinition,
  ): Promise<CollectionDefinition | undefined> {
    const data = JSON.stringify({ collection });
    return (
      await this.callPostmanApi(
        `/collections/${collectionId}`,
        HttpMethod.PUT,
        data,
      )
    )?.collection;
  }

  async createCollectionFromSchema(
    apiId: string,
    apiVersionId: string,
    schemaId: string,
    collectionName: string,
  ): Promise<SchemaCollectionResult | undefined> {
    const data = JSON.stringify({
      name: collectionName,
      relations: [
        {
          type: 'documentation',
        },
      ],
    });
    return await this.callPostmanApi(
      `/apis/${apiId}/versions/${apiVersionId}/schemas/${schemaId}/collections?workspace=${this.postmanWorkspaceId}`,
      HttpMethod.POST,
      data,
    );
  }

  async getDocumentationCollectionId(
    apiId: string,
    apiVersionId: string,
  ): Promise<string | undefined> {
    const docRelation = await this.callPostmanApi(
      `/apis/${apiId}/versions/${apiVersionId}/documentation`,
    );
    if (docRelation?.documentation && docRelation.documentation.length > 0) {
      return docRelation.documentation[0]?.collectionId;
    }

    return undefined;
  }

  private async callPostmanApi(
    api: string,
    method: HttpMethod = HttpMethod.GET,
    payload: any = undefined,
  ): Promise<any> {
    const config = {
      method: method,
      url: `${this.baseUrl}${api}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
    } as AxiosRequestConfig;

    if (payload) {
      config.data = payload;
    }

    const spinner = ora({
      prefixText: ' ',
      text: `Calling "${config.method} ${config.url}" ...\n`,
    });

    spinner.start();
    let responseStatusCode;

    try {
      axios.interceptors.request.use((req) => {
        spinner.text = `Executing "${config.method} ${config.url}" in Postman. Waiting for response...\n`;
        return req;
      });

      axios.interceptors.response.use(
        (response) => {
          spinner.text = `Response Received: ${response?.status}\n`;

          responseStatusCode = response.status;
          return response;
        },
        (error) => {
          if (!error.response) {
            error.response = {};
          }
          responseStatusCode = error?.response?.status || error?.code;
          return error;
        },
      );

      let response: AxiosResponse<Readable> | undefined;
      let error: AxiosError | undefined;

      try {
        response = await axios.request(config);
      } catch (err: any) {
        error = err;
        response = error?.response;
      }

      const respData = response?.data;

      spinner.succeed(
        `Calling "${config.method} ${config.url}" was successful`,
      );
      return respData;
    } catch (error: any) {
      spinner.fail(
        chalk.red(`Upload to Postman Failed: ${responseStatusCode}`),
      );
      spinner.clear();
      return (
        error?.response?.data ??
        error.response ??
        error?.toJSON() ??
        error?.toString()
      );
    }
  }
}

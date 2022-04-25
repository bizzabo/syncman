export type WorkspaceDetailResult = {
  id: string;
  name: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  collections: [
    {
      id: string;
      uid: string;
      name: string;
    },
  ];
};

export type ApiResult = {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

enum Stages {
  Planning = 'Planning',
  Design = 'Design',
  Deprecated = 'Deprecated',
  Testing = 'Testing',
  Development = 'In Development',
  Production = 'In Production',
}

export type ApiVersionModel = {
  id: string;
  api: string; // reference to ApiModel
  name: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  stage: Stages;
  visibility: 'public' | 'private';
  repositoryIntegration?: string;
  lastRevision?: string;
  schema: Array<string>;
};

export type ApiSchemaResult = {
  id: string;
  apiVersion: string; // reference to ApiVersionModel
  language: 'yaml' | 'json';
  type: 'openapi3' | 'openapi2';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type ApiCollectionResult = {
  id: string;
  uid: string;
  name: string;
  owner: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

type RelationTypes = 'documentation' | 'contracttest' | 'testsuite' | 'mock';

export type SchemaCollectionResult = {
  collection: { id: string; uid: string };
  relations: Array<{ id: string; type: RelationTypes }>;
};

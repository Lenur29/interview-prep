import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env['VITE_LEMUR_API_GQL_URL'] ?? 'https://api.lemurjs.local/graphql',
  documents: ['./src/**/*.graphql'],
  generates: {
    './src/types.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        scalars: {
          DateTime: 'string',
          BigInt: 'number',
        },
        namingConvention: {
          enumValues: 'keep',
        },
        skipDocumentsValidation: {
          skipDuplicateValidation: true,
        },
      },
    },
  },
};

export default config;

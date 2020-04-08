/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { Pipeline } from '../../../common/types';
import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

const bodySchema = schema.object({
  description: schema.string(),
  processors: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  version: schema.maybe(schema.number()),
  onFailure: schema.maybe(schema.arrayOf(schema.recordOf(schema.string(), schema.any()))),
});

const paramsSchema = schema.object({
  name: schema.string(),
});

export const registerUpdateRoute = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.put(
    {
      path: `${API_BASE_PATH}/{name}`,
      validate: {
        body: bodySchema,
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const { name } = req.params;
      const pipeline = req.body as Pipeline;

      const { description, processors, version, onFailure } = pipeline;

      try {
        // Verify pipeline exists; ES will throw 404 if it doesn't
        await callAsCurrentUser('ingest.getPipeline', { id: name });

        const response = await callAsCurrentUser('ingest.putPipeline', {
          id: name,
          body: {
            description,
            processors,
            version,
            on_failure: onFailure,
          },
        });

        return res.ok({ body: response });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
};

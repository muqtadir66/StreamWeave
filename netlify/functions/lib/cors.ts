import type { HandlerResponse } from '@netlify/functions';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const withCors = (res: HandlerResponse): HandlerResponse => ({
  ...res,
  headers: { ...corsHeaders, ...(res.headers || {}) },
});


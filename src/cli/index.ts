#!/usr/bin/env node
import { main } from './cli.js';
import { getErrorMessage } from './errors.js';

main(process.argv).catch(err => {
  console.error(getErrorMessage(err));
  process.exit(1);
});

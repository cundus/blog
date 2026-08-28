/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    session?: import('./db/schema').Session;
  }
}

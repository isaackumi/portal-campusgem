/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attendance from "../attendance.js";
import type * as camp from "../camp.js";
import type * as core from "../core.js";
import type * as forms from "../forms.js";
import type * as groups from "../groups.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_birthday from "../lib/birthday.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_serverSecret from "../lib/serverSecret.js";
import type * as members from "../members.js";
import type * as users from "../users.js";
import type * as visitors from "../visitors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attendance: typeof attendance;
  camp: typeof camp;
  core: typeof core;
  forms: typeof forms;
  groups: typeof groups;
  "lib/access": typeof lib_access;
  "lib/birthday": typeof lib_birthday;
  "lib/phone": typeof lib_phone;
  "lib/serverSecret": typeof lib_serverSecret;
  members: typeof members;
  users: typeof users;
  visitors: typeof visitors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessLog from "../accessLog.js";
import type * as activity from "../activity.js";
import type * as attendance from "../attendance.js";
import type * as authCodes from "../authCodes.js";
import type * as camp from "../camp.js";
import type * as campuses from "../campuses.js";
import type * as checkinSessions from "../checkinSessions.js";
import type * as comms from "../comms.js";
import type * as core from "../core.js";
import type * as events from "../events.js";
import type * as forms from "../forms.js";
import type * as groups from "../groups.js";
import type * as households from "../households.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_birthday from "../lib/birthday.js";
import type * as lib_campCheckInCode from "../lib/campCheckInCode.js";
import type * as lib_campFormSubmit from "../lib/campFormSubmit.js";
import type * as lib_campusMembership from "../lib/campusMembership.js";
import type * as lib_campRegistrationDuplicate from "../lib/campRegistrationDuplicate.js";
import type * as lib_campRegistrationInsert from "../lib/campRegistrationInsert.js";
import type * as lib_dateOfBirthValidation from "../lib/dateOfBirthValidation.js";
import type * as lib_importContact from "../lib/importContact.js";
import type * as lib_personIdentity from "../lib/personIdentity.js";
import type * as lib_phone from "../lib/phone.js";
import type * as lib_rlcCheckInCode from "../lib/rlcCheckInCode.js";
import type * as lib_serverSecret from "../lib/serverSecret.js";
import type * as members from "../members.js";
import type * as myGem from "../myGem.js";
import type * as pastoral from "../pastoral.js";
import type * as rlc from "../rlc.js";
import type * as smsInbox from "../smsInbox.js";
import type * as users from "../users.js";
import type * as visitors from "../visitors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessLog: typeof accessLog;
  activity: typeof activity;
  attendance: typeof attendance;
  authCodes: typeof authCodes;
  camp: typeof camp;
  campuses: typeof campuses;
  checkinSessions: typeof checkinSessions;
  comms: typeof comms;
  core: typeof core;
  events: typeof events;
  forms: typeof forms;
  groups: typeof groups;
  households: typeof households;
  "lib/access": typeof lib_access;
  "lib/birthday": typeof lib_birthday;
  "lib/campCheckInCode": typeof lib_campCheckInCode;
  "lib/campFormSubmit": typeof lib_campFormSubmit;
  "lib/campusMembership": typeof lib_campusMembership;
  "lib/campRegistrationDuplicate": typeof lib_campRegistrationDuplicate;
  "lib/campRegistrationInsert": typeof lib_campRegistrationInsert;
  "lib/dateOfBirthValidation": typeof lib_dateOfBirthValidation;
  "lib/importContact": typeof lib_importContact;
  "lib/personIdentity": typeof lib_personIdentity;
  "lib/phone": typeof lib_phone;
  "lib/rlcCheckInCode": typeof lib_rlcCheckInCode;
  "lib/serverSecret": typeof lib_serverSecret;
  members: typeof members;
  myGem: typeof myGem;
  pastoral: typeof pastoral;
  rlc: typeof rlc;
  smsInbox: typeof smsInbox;
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

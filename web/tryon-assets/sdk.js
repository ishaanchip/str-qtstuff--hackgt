import { r as e, t } from "./rolldown-runtime-B0aSnxlc.mjs";
//#region web/node_modules/@decartai/sdk/dist/utils/errors.js
var n = {
	INVALID_API_KEY: "INVALID_API_KEY",
	INVALID_BASE_URL: "INVALID_BASE_URL",
	PROCESSING_ERROR: "PROCESSING_ERROR",
	INVALID_INPUT: "INVALID_INPUT",
	INVALID_OPTIONS: "INVALID_OPTIONS",
	MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
	QUEUE_SUBMIT_ERROR: "QUEUE_SUBMIT_ERROR",
	QUEUE_STATUS_ERROR: "QUEUE_STATUS_ERROR",
	QUEUE_RESULT_ERROR: "QUEUE_RESULT_ERROR",
	JOB_NOT_COMPLETED: "JOB_NOT_COMPLETED",
	TOKEN_CREATE_ERROR: "TOKEN_CREATE_ERROR",
	TOKEN_INVALID: "TOKEN_INVALID",
	TOKEN_EXPIRED: "TOKEN_EXPIRED",
	TOKEN_VERIFY_ERROR: "TOKEN_VERIFY_ERROR",
	FILES_UPLOAD_ERROR: "FILES_UPLOAD_ERROR",
	FILES_GET_ERROR: "FILES_GET_ERROR",
	FILES_DELETE_ERROR: "FILES_DELETE_ERROR",
	REACT_NATIVE_SETUP_REQUIRED: "REACT_NATIVE_SETUP_REQUIRED",
	UNSUPPORTED_PLATFORM_FEATURE: "UNSUPPORTED_PLATFORM_FEATURE",
	LIVEKIT_INITIALIZATION_ERROR: "LIVEKIT_INITIALIZATION_ERROR",
	WEBRTC_WEBSOCKET_ERROR: "WEBRTC_WEBSOCKET_ERROR",
	WEBRTC_ICE_ERROR: "WEBRTC_ICE_ERROR",
	WEBRTC_TIMEOUT_ERROR: "WEBRTC_TIMEOUT_ERROR",
	WEBRTC_SERVER_ERROR: "WEBRTC_SERVER_ERROR",
	WEBRTC_SIGNALING_ERROR: "WEBRTC_SIGNALING_ERROR"
};
function r(e, t, n, r) {
	return {
		code: e,
		message: t,
		data: n,
		cause: r
	};
}
function i() {
	return r(n.INVALID_API_KEY, "Missing API key. Pass `apiKey` to createDecartClient() or set the DECART_API_KEY environment variable.");
}
function a(e) {
	return r(n.INVALID_BASE_URL, `Invalid base URL${e ? `: ${e}` : ""}`);
}
function o(e, t) {
	return r(n.LIVEKIT_INITIALIZATION_ERROR, e, void 0, t);
}
function s(e) {
	return r(n.WEBRTC_WEBSOCKET_ERROR, "WebSocket connection failed", void 0, e);
}
function c(e) {
	return r(n.WEBRTC_ICE_ERROR, "ICE connection failed", void 0, e);
}
function l(e, t, i) {
	let a = typeof t == "number" && Number.isFinite(t);
	return r(n.WEBRTC_TIMEOUT_ERROR, a ? `${e} timed out after ${t}ms` : `${e} timed out`, a ? {
		phase: e,
		timeoutMs: t
	} : { phase: e }, i);
}
function u(e) {
	return r(n.WEBRTC_SERVER_ERROR, e);
}
function d(e) {
	return r(n.WEBRTC_SIGNALING_ERROR, "Signaling error", void 0, e);
}
function f(e) {
	let t = e.message.toLowerCase();
	if (e.source === "server") return u(e.message);
	if (t.includes("websocket")) return s(e);
	if (t.includes("ice connection failed")) return c(e);
	if (t.includes("timeout") || t.includes("timed out")) {
		let n = t.match(/(\d+)\s*ms/);
		return l("connection", n ? Number.parseInt(n[1], 10) : void 0, e);
	}
	return d(e);
}
function p(e) {
	return r(n.INVALID_INPUT, e);
}
function m(e) {
	return r(n.MODEL_NOT_FOUND, `Model ${e} not found`);
}
function h(e, t) {
	return r(n.QUEUE_SUBMIT_ERROR, e, { status: t });
}
function g(e, t) {
	return r(n.QUEUE_STATUS_ERROR, e, { status: t });
}
function _(e, t) {
	return r(n.QUEUE_RESULT_ERROR, e, { status: t });
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/tokens/claims.js
var v = (e) => typeof e == "string" && e.startsWith("eyJ") && e.split(".").length === 3, y = (e, t) => r(n.TOKEN_INVALID, `Invalid client token: ${e}`, t), b = (e) => typeof e == "number" && Number.isInteger(e) ? e : typeof e == "string" && /^\s*[+-]?\d+\s*$/.test(e) ? Number.parseInt(e, 10) : null, ee = (e) => typeof e == "string" ? e : null, te = (e) => Array.isArray(e) && e.every((e) => typeof e == "string") ? e : null;
function ne(e) {
	if (typeof e.sub != "string" || !e.sub) throw y("missing `sub` claim", { claim: "sub" });
	if (typeof e.exp != "number") throw y("missing `exp` claim", { claim: "exp" });
	let t = b(e.service_tier) ?? (e.priority ? 3 : null), n = e.attribution;
	return {
		serviceTier: t,
		pool: t === 0 ? "free" : "paid",
		userId: e.sub,
		organizationId: ee(e.organizationId),
		apiKeyName: ee(e.api_key_name),
		apiKeyId: ee(e.parent_api_key_id) ?? ee(e.jti),
		allowedModels: te(e.models),
		allowedOrigins: te(e.origins),
		expiresAt: (/* @__PURE__ */ new Date(e.exp * 1e3)).toISOString(),
		realtimeConcurrentSessionLimit: typeof e.realtimeConcurrentSessionLimit == "number" ? e.realtimeConcurrentSessionLimit : null,
		zeroDataRetention: e.zeroDataRetention === !0,
		attribution: typeof n == "object" && n && !Array.isArray(n) ? n : null,
		raw: e
	};
}
function re(e) {
	if (!v(e)) throw y("not a JWT", { reason: "malformed" });
	let t;
	try {
		let n = e.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), r = atob(n).replace(/[\s\S]/g, (e) => `%${e.charCodeAt(0).toString(16).padStart(2, "0")}`);
		t = JSON.parse(decodeURIComponent(r));
	} catch {
		throw y("payload is not base64url JSON", { reason: "malformed" });
	}
	if (typeof t != "object" || !t || Array.isArray(t)) throw y("payload is not a JSON object", { reason: "malformed" });
	return ne(t);
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/tokens/verify.js
var x = "https://platform.decart.ai", ie, ae = /* @__PURE__ */ new Map();
async function oe(e, t = {}) {
	if (!v(e)) throw r(n.TOKEN_INVALID, "Invalid client token: not a JWT", { reason: "malformed" });
	if (!globalThis.crypto?.subtle) throw r(n.UNSUPPORTED_PLATFORM_FEATURE, "verifyClientToken needs WebCrypto (crypto.subtle), which this runtime does not provide. Verify client tokens on your server; decodeClientToken works everywhere.", { feature: "verifyClientToken" });
	let i = t.jwksUrl ?? `${x}/api/auth/jwks`;
	ie ||= import("./webapi-CqW8TCnx.mjs");
	let { jwtVerify: a, createRemoteJWKSet: o, errors: s } = await ie, c = ae.get(i);
	c || (c = o(new URL(i), { cooldownDuration: 6e4 }), ae.set(i, c));
	try {
		let { payload: n } = await a(e, c, {
			algorithms: ["EdDSA"],
			issuer: t.issuer ?? x,
			audience: t.audience ?? x,
			clockTolerance: t.clockTolerance ?? 60,
			requiredClaims: ["exp", "sub"]
		});
		return ne(n);
	} catch (e) {
		let t = e instanceof Error ? e : void 0, { code: a = "unknown", claim: o } = t ?? {}, c = {
			reason: a,
			...o ? { claim: o } : {}
		};
		throw e instanceof s.JWTExpired ? r(n.TOKEN_EXPIRED, `Client token expired: ${t?.message}`, c, t) : e instanceof s.JOSEError && !/^ERR_(JOSE_GENERIC|JWKS_INVALID|JWKS_TIMEOUT)$/.test(a) ? r(n.TOKEN_INVALID, `Invalid client token: ${t?.message}`, c, t) : r(n.TOKEN_VERIFY_ERROR, `Could not load the client-token JWKS from ${i}: ${t?.message ?? String(e)}`, {
			...c,
			jwksUrl: i
		}, t);
	}
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/utils/logger.js
var se = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
};
function S(e = "warn") {
	let t = se[e], n = (e, n, r) => {
		if (se[e] < t) return;
		let i = "[DecartSDK]";
		r ? console[e](i, n, r) : console[e](i, n);
	};
	return {
		debug: (e, t) => n("debug", e, t),
		info: (e, t) => n("info", e, t),
		warn: (e, t) => n("warn", e, t),
		error: (e, t) => n("error", e, t)
	};
}
//#endregion
//#region web/node_modules/zod/v4/core/util.js
function ce(e) {
	let t = Object.values(e).filter((e) => typeof e == "number");
	return Object.entries(e).filter(([e, n]) => t.indexOf(+e) === -1).map(([e, t]) => t);
}
function le(e, t = "|") {
	return e.map((e) => je(e)).join(t);
}
function ue(e, t) {
	return typeof t == "bigint" ? t.toString() : t;
}
var de = class {
	constructor(e) {
		this._getter = e, this._value = void 0;
	}
	get value() {
		let e = this._getter;
		return e !== void 0 && (this._value = e(), this._getter = void 0), this._value;
	}
};
function fe(e) {
	return new de(e);
}
function pe(e) {
	return e == null;
}
function me(e) {
	let t = +!!e.startsWith("^"), n = e.endsWith("$") ? e.length - 1 : e.length;
	return e.slice(t, n);
}
function he(e, t) {
	let n = e / t, r = Math.round(n), i = 4 * 2 ** -52 * Math.max(Math.abs(n), 1);
	return Math.abs(n - r) < i ? 0 : n - r;
}
function C(e, t, n) {
	Object.defineProperty(e, t, {
		value: n,
		writable: !0,
		enumerable: !0,
		configurable: !0
	});
}
function ge(e) {
	let t = Object.getOwnPropertyDescriptor(e, "shape");
	return t?.get ? t.get.raw : t?.value;
}
function w(e) {
	return ge(e._zod.def) ?? e._zod.def.shape;
}
function _e(e, t, n) {
	Object.defineProperty(e, t, {
		get() {
			let e = n();
			return C(this, t, e), e;
		},
		enumerable: !0,
		configurable: !0
	});
}
function ve(e, t, n) {
	t in e ? C(e, t, n) : e[t] = n;
}
function ye(e, t, n, r) {
	let i = w(t);
	for (let a of n) {
		let n = Object.getOwnPropertyDescriptor(i, a);
		n.enumerable && (n.get ? _e(e, a, () => {
			let e = t._zod.def.shape[a];
			return r ? r(e, a) : e;
		}) : ve(e, a, r ? r(n.value, a) : n.value));
	}
}
function be(e, t) {
	for (let n of Reflect.ownKeys(t)) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.enumerable && (r.get ? _e(e, n, () => t[n]) : ve(e, n, r.value));
	}
}
function T(...e) {
	let t = {};
	for (let n of e) {
		let e = Object.getOwnPropertyDescriptors(n);
		Object.assign(t, e);
	}
	return Object.defineProperties({}, t);
}
function xe(e) {
	return JSON.stringify(e);
}
function Se(e) {
	return e.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
var Ce = "captureStackTrace" in Error ? Error.captureStackTrace : (...e) => {};
function we(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
var Te = /* @__PURE__*/ fe(() => {
	if (j.jitless || typeof navigator < "u" && navigator?.userAgent?.includes("Cloudflare")) return !1;
	try {
		return Function(""), !0;
	} catch {
		return !1;
	}
});
function Ee(e) {
	if (we(e) === !1) return !1;
	let t = e.constructor;
	if (t === void 0 || typeof t != "function") return !0;
	let n = t.prototype;
	return we(n) !== !1 && Object.prototype.hasOwnProperty.call(n, "isPrototypeOf") !== !1;
}
function De(e) {
	return Ee(e) ? { ...e } : Array.isArray(e) ? [...e] : e instanceof Map ? new Map(e) : e instanceof Set ? new Set(e) : e;
}
var Oe = /* @__PURE__*/ new Set([
	"string",
	"number",
	"symbol"
]);
function ke(e) {
	return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Ae(e, t, n) {
	let r = new e._zod.constr(t ?? e._zod.def);
	return (!t || n?.parent) && (r._zod.parent = e), r;
}
function E(e) {
	let t = e;
	if (!t) return {};
	if (typeof t == "string") return { error: () => t };
	if (t?.message !== void 0) {
		if (t?.error !== void 0) throw Error("Cannot specify both `message` and `error` params");
		t.error = t.message;
	}
	return delete t.message, typeof t.error == "string" ? {
		...t,
		error: () => t.error
	} : t;
}
function je(e) {
	return typeof e == "bigint" ? e.toString() + "n" : typeof e == "string" ? `"${e}"` : `${e}`;
}
function Me(e) {
	return Object.keys(e).filter((t) => e[t]._zod.optin !== void 0 && e[t]._zod.optout === "optional");
}
var Ne = {
	safeint: [-(2 ** 53 - 1), 2 ** 53 - 1],
	int32: [-2147483648, 2147483647],
	uint32: [0, 4294967295],
	float32: [-34028234663852886e22, 34028234663852886e22],
	float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
}, Pe = {
	int64: [/* @__PURE__*/ BigInt("-9223372036854775808"), /* @__PURE__*/ BigInt("9223372036854775807")],
	uint64: [/* @__PURE__*/ BigInt(0), /* @__PURE__*/ BigInt("18446744073709551615")]
};
function Fe(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
	let i = {};
	return ye(i, e, Ie(e, t)), Ae(e, T(n, {
		shape: i,
		checks: []
	}));
}
function Ie(e, t) {
	let n = w(e), r = [];
	for (let e of Reflect.ownKeys(t)) {
		if (!Object.getOwnPropertyDescriptor(n, e)?.enumerable) throw Error(`Unrecognized key: "${String(e)}"`);
		t[e] && r.push(e);
	}
	return r;
}
function Le(e, t) {
	let n = e._zod.def, r = n.checks;
	if (r && r.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
	let i = new Set(Ie(e, t)), a = {};
	return ye(a, e, Reflect.ownKeys(w(e)).filter((e) => !i.has(e))), Ae(e, T(n, {
		shape: a,
		checks: []
	}));
}
function Re(e, t) {
	if (!Ee(t)) throw Error("Invalid input to extend: expected a plain object");
	let n = e._zod.def.checks;
	if (n && n.length > 0) {
		let n = w(e);
		for (let e of Reflect.ownKeys(t)) if (Object.getOwnPropertyDescriptor(n, e) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
	}
	return Ae(e, T(e._zod.def, { shape: ze(e, t) }));
}
function ze(e, t) {
	let n = {};
	return ye(n, e, Reflect.ownKeys(w(e))), be(n, t), n;
}
function Be(e, t) {
	if (!Ee(t)) throw Error("Invalid input to safeExtend: expected a plain object");
	return Ae(e, T(e._zod.def, { shape: ze(e, t) }));
}
function Ve(e, t) {
	if (!t?._zod?.def) throw Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
	if (e._zod.def.checks?.length) throw Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
	let n = {};
	return ye(n, e, Reflect.ownKeys(w(e))), ye(n, t, Reflect.ownKeys(w(t))), Ae(e, T(e._zod.def, {
		shape: n,
		get catchall() {
			return t._zod.def.catchall;
		},
		checks: t._zod.def.checks ?? []
	}));
}
function He(e, t, n, r = "partial") {
	let i = t._zod.def.checks;
	if (i && i.length > 0) throw Error(`.${r}() cannot be used on object schemas containing refinements`);
	let a = n ? new Set(Ie(t, n)) : void 0, o = {};
	return ye(o, t, Reflect.ownKeys(w(t)), e && ((t, n) => a && !a.has(n) ? t : new e({
		type: "optional",
		innerType: t
	}))), Ae(t, T(t._zod.def, {
		shape: o,
		checks: []
	}));
}
function Ue(e, t, n) {
	let r = n ? new Set(Ie(t, n)) : void 0, i = {};
	return ye(i, t, Reflect.ownKeys(w(t)), (t, n) => r && !r.has(n) ? t : new e({
		type: "nonoptional",
		innerType: t
	})), Ae(t, T(t._zod.def, { shape: i }));
}
function D(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue !== !0) return !0;
	return !1;
}
function We(e, t = 0) {
	if (e.aborted === !0) return !0;
	for (let n = t; n < e.issues.length; n++) if (e.issues[n]?.continue === !1) return !0;
	return !1;
}
function Ge(e, t) {
	return t.map((t) => {
		var n;
		return (n = t).path ?? (n.path = []), t.path.unshift(e), t;
	});
}
function Ke(e) {
	return typeof e == "string" ? e : e?.message;
}
function qe(e, t, n) {
	var r;
	for (let i = t; i < e.length; i++) (r = e[i]).schema ?? (r.schema = n);
}
function Je(e, t, n) {
	var r;
	let i = e.inst?._zod?.traits;
	i?.has("$ZodType") && (i.has("$ZodCheck") ? (r = e).schema ?? (r.schema = e.inst) : e.schema = e.inst);
	let a = e.schema === e.inst ? void 0 : e.schema?._zod.def?.error, o = e.message ? e.message : Ke(e.inst?._zod.def?.error?.(e)) ?? Ke(a?.(e)) ?? Ke(t?.error?.(e)) ?? Ke(n.customError?.(e)) ?? Ke(n.localeError?.(e)) ?? "Invalid input", s = {};
	for (let t of Object.keys(e)) t !== "inst" && t !== "schema" && t !== "continue" && t !== "input" && t !== "__proto__" && (s[t] = e[t]);
	return s.path ??= [], s.message = o, t?.reportInput && (s.input = e.input), s;
}
var Ye = /[\uD800-\uDBFF]/;
function Xe(e) {
	let t = e.length;
	if (!Ye.test(e)) return t;
	let n = t;
	for (let r = 0; r < t - 1; r++) (e.charCodeAt(r) & 64512) == 55296 && (e.charCodeAt(r + 1) & 64512) == 56320 && (n--, r++);
	return n;
}
function Ze(e) {
	return Array.isArray(e) ? "array" : typeof e == "string" ? "string" : "unknown";
}
function Qe(e) {
	let t = typeof e;
	switch (t) {
		case "number": return Number.isNaN(e) ? "nan" : "number";
		case "object": {
			if (e === null) return "null";
			if (Array.isArray(e)) return "array";
			let t = e;
			if (t && Object.getPrototypeOf(t) !== Object.prototype && "constructor" in t && t.constructor) return t.constructor.name;
		}
	}
	return t;
}
function $e(...e) {
	let [t, n, r] = e;
	return typeof t == "string" ? {
		message: t,
		code: "custom",
		input: n,
		inst: r
	} : { ...t };
}
function et(e, t) {
	for (let n in t) {
		let r = Object.getOwnPropertyDescriptor(t, n);
		r.get ? Object.defineProperty(e, n, {
			...r,
			enumerable: !1
		}) : rt(e, n, r.value);
	}
}
function O(e, t, n, r = !0) {
	return Object.defineProperty(e, t, {
		configurable: !0,
		writable: !0,
		enumerable: r,
		value: n
	}), n;
}
function tt(e, t, n) {
	return O(e, t, n, !1);
}
function nt(e, t) {
	for (let n in e) {
		let r = e[n];
		Object.defineProperty(t, n, {
			configurable: !0,
			enumerable: !0,
			get() {
				return O(this, n, r(this));
			},
			set(e) {
				O(this, n, e);
			}
		});
	}
	return t;
}
function rt(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		get() {
			return this == null ? n : O(this, t, n.bind(this));
		},
		set(e) {
			O(this, t, e);
		}
	});
}
function it(e, t) {
	let n = Object.getPrototypeOf(e);
	return t in n ? void 0 : n;
}
var at, ot = !1, st = {
	configurable: !0,
	get() {
		ot = !0;
	}
};
function k(e, t, n) {
	let r = Object.getPrototypeOf(e._zod);
	if (t in r && at !== e._zod) {
		at = void 0;
		return;
	}
	at = e._zod, Object.defineProperty(r, t, {
		configurable: !0,
		get() {
			Object.defineProperty(this, t, st);
			let e = ot;
			ot = !1;
			try {
				let r = n(this);
				return ot ? delete this[t] : Object.defineProperty(this, t, {
					configurable: !0,
					writable: !0,
					value: r
				}), ot ||= e, r;
			} catch (n) {
				throw delete this[t], ot ||= e, n;
			}
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				value: e
			});
		}
	});
}
function ct(e, t, n, r) {
	let i = it(e, t);
	i && Object.defineProperty(i, t, {
		configurable: !0,
		get() {
			let e = {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: void 0
			};
			return Object.defineProperty(this, t, e), e.value = n(this), Object.defineProperty(this, t, e), e.value;
		},
		set(e) {
			Object.defineProperty(this, t, {
				configurable: !0,
				writable: !0,
				enumerable: r,
				value: e
			});
		}
	});
}
var lt = "~constantCatch";
function ut(e) {
	let t = () => e;
	return t[lt] = !0, t;
}
//#endregion
//#region web/node_modules/zod/v4/core/core.js
var dt, ft = {
	value: void 0,
	enumerable: !1
}, pt = "captureStackTrace" in Error ? Error : null;
function mt(e) {
	let t = pt;
	if (t) {
		let n = t.stackTraceLimit;
		if (typeof n == "number") {
			try {
				t.stackTraceLimit = 0;
			} catch {
				return pt = null, new e();
			}
			try {
				return new e();
			} finally {
				t.stackTraceLimit = n;
			}
		}
	}
	return new e();
}
function A(e, t, n, r) {
	let i = {};
	function a(e) {
		this.def = e, this.constr = d, this.traits = /* @__PURE__ */ new Set();
	}
	a.prototype = i;
	let o = n, s = o && /* @__PURE__ */ new WeakSet();
	function c(n, r) {
		if (!n._zod) {
			ft.value = new a(r);
			try {
				Object.defineProperty(n, "_zod", ft);
			} finally {
				ft.value = void 0;
			}
		} else if (n._zod.traits.has(e)) return;
		if (n._zod.traits.add(e), t(n, r), s) {
			let e = Object.getPrototypeOf(n), t = n._zod.constr.prototype, r = e;
			for (; r && r !== t;) r = Object.getPrototypeOf(r);
			let i = r ?? e;
			s.has(i) || (s.add(i), et(i, o));
		}
		let i = d.prototype;
		for (let e in i) Object.prototype.hasOwnProperty.call(i, e) && (e in n || (n[e] = i[e].bind(n)));
	}
	let l = r?.Parent ?? Object;
	class u extends l {}
	Object.defineProperty(u, "name", { value: e });
	function d(e) {
		let t = r?.Parent ? mt(u) : this;
		c(t, e);
		let n = t._zod.deferred;
		if (n) {
			for (let e of n) e();
			t._zod.deferred = void 0;
		}
		let i = globalThis.__zod_globalConfig?.postProcessor;
		return i && i(t), t;
	}
	return Object.defineProperty(d, "init", { value: c }), Object.defineProperty(d, Symbol.hasInstance, { value: (t) => r?.Parent && t instanceof r.Parent ? !0 : t?._zod?.traits?.has(e) }), Object.defineProperty(d, "name", { value: e }), d;
}
var ht = class extends Error {
	constructor() {
		super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
	}
}, gt = class extends Error {
	constructor(e) {
		super(`Encountered unidirectional transform during encode: ${e}`), this.name = "ZodEncodeError";
	}
};
(dt = globalThis).__zod_globalConfig ?? (dt.__zod_globalConfig = {});
var j = globalThis.__zod_globalConfig;
function M(e) {
	return e && Object.assign(j, e), j;
}
//#endregion
//#region web/node_modules/zod/v4/core/errors.js
function _t() {
	let e = this._zod;
	return e.message ??= JSON.stringify(e.def, ue, 2), e.message;
}
function vt(e) {
	this._zod.message = e;
}
var yt = {
	get: _t,
	set: vt,
	enumerable: !0,
	configurable: !0
}, bt = {
	value: void 0,
	enumerable: !1
}, xt = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]), St = (e, t) => {
	e.name = "$ZodError", bt.value = t, Object.defineProperty(e, "issues", bt), bt.value = void 0, Object.defineProperty(e, "message", yt);
	let n = Object.getPrototypeOf(e);
	xt.has(n) || (xt.add(n), Object.defineProperty(n, "toString", {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = () => this.message;
			return Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, "toString", {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	}));
}, Ct = A("$ZodError", St);
A("$ZodError", St, void 0, { Parent: Error });
function wt(e, t, n) {
	return Object.prototype.hasOwnProperty.call(e, t) || (t === "__proto__" ? Object.defineProperty(e, t, {
		value: n(),
		writable: !0,
		enumerable: !0,
		configurable: !0
	}) : e[t] = n()), e[t];
}
function Tt(e, t = (e) => e.message) {
	let n = {}, r = [];
	for (let i of e.issues) i.path.length > 0 ? wt(n, i.path[0], () => []).push(t(i)) : r.push(t(i));
	return {
		formErrors: r,
		fieldErrors: n
	};
}
function Et(e, t = (e) => e.message) {
	let n = { _errors: [] }, r = (e, i = []) => {
		for (let a of e.issues) if (a.code === "invalid_union" && a.errors.length) a.errors.map((e) => r({ issues: e }, [...i, ...a.path]));
		else if (a.code === "invalid_key") r({ issues: a.issues }, [...i, ...a.path]);
		else if (a.code === "invalid_element") r({ issues: a.issues }, [...i, ...a.path]);
		else {
			let e = [...i, ...a.path];
			if (e.length === 0) n._errors.push(t(a));
			else {
				let r = n, i = 0;
				for (; i < e.length;) {
					let n = e[i], o = i === e.length - 1;
					if (n === "_errors") {
						o && r._errors.push(t(a)), i++;
						continue;
					}
					Object.prototype.hasOwnProperty.call(r, n) || Object.defineProperty(r, n, {
						value: { _errors: [] },
						enumerable: !0,
						writable: !0,
						configurable: !0
					});
					let s = r[n];
					o && s._errors.push(t(a)), r = s, i++;
				}
			}
		}
	};
	return r(e), n;
}
//#endregion
//#region web/node_modules/zod/v4/core/parse.js
function Dt(e, t) {
	return {
		callee: t?.callee ?? e,
		Err: t?.Err
	};
}
var Ot = (e) => {
	let t = (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !1
		} : { async: !1 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise) throw new ht();
		if (s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => Je(e, o, M())));
			throw Ce(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, kt = (e) => {
	let t = async (n, r, i, a) => {
		let o = i ? {
			...i,
			async: !0
		} : { async: !0 }, s = n._zod.run({
			value: r,
			issues: []
		}, o);
		if (s instanceof Promise && (s = await s), s.issues.length) {
			let n = new ((a?.Err) ?? e)(s.issues.map((e) => Je(e, o, M())));
			throw Ce(n, a?.callee ?? t), n;
		}
		return s.value;
	};
	return t;
}, At = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		async: !1
	} : { async: !1 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	if (a instanceof Promise) throw new ht();
	return a.issues.length ? jt(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
};
function jt(e, t, n) {
	let r;
	return {
		success: !1,
		get error() {
			return r || (r = new e(t.map((e) => Je(e, n, M()))), t = void 0, n = void 0), r;
		},
		set error(e) {
			r = e, t = void 0, n = void 0;
		}
	};
}
var Mt = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		async: !0
	} : { async: !0 }, a = t._zod.run({
		value: n,
		issues: []
	}, i);
	return a instanceof Promise && (a = await a), a.issues.length ? jt(e, a.issues, i) : {
		success: !0,
		data: a.value
	};
}, Nt = /* @__PURE__ */ Symbol.for("zod.compile.invalid"), Pt = /* @__PURE__ */ Symbol.for("zod.compile.fallback"), Ft = ((e, t, n) => {
	let r = e._zod.bag.validator;
	if (r !== void 0) {
		if (r(t) !== Nt) return !0;
		if (r.definite === !0 && n === void 0) return !1;
	}
	return It(e, t, n);
});
function It(e, t, n) {
	let r = n ? {
		...n,
		async: !1,
		abortEarly: !0
	} : {
		async: !1,
		abortEarly: !0
	}, i = e._zod.bag.fallbackRun, a;
	if (i ? (r[Pt] = !0, a = i({
		value: t,
		issues: []
	}, r)) : a = e._zod.run({
		value: t,
		issues: []
	}, r), a instanceof Promise) throw new ht();
	return a.issues.length === 0;
}
var Lt = async (e, t, n) => {
	let r = n ? {
		...n,
		async: !0,
		abortEarly: !0
	} : {
		async: !0,
		abortEarly: !0
	}, i = e._zod.run({
		value: t,
		issues: []
	}, r);
	return i instanceof Promise && (i = await i), i.issues.length === 0;
}, Rt = (e) => {
	let t = Ot(e), n = (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return t(e, r, o, Dt(n, a));
	};
	return n;
}, zt = (e) => {
	let t = Ot(e), n = (e, r, i, a) => t(e, r, i, Dt(n, a));
	return n;
}, Bt = (e) => {
	let t = kt(e), n = async (e, r, i, a) => {
		let o = i ? {
			...i,
			direction: "backward"
		} : { direction: "backward" };
		return await t(e, r, o, Dt(n, a));
	};
	return n;
}, Vt = (e) => {
	let t = kt(e), n = async (e, r, i, a) => await t(e, r, i, Dt(n, a));
	return n;
}, Ht = (e) => (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return At(e)(t, n, i);
}, Ut = (e) => (t, n, r) => At(e)(t, n, r), Wt = (e) => async (t, n, r) => {
	let i = r ? {
		...r,
		direction: "backward"
	} : { direction: "backward" };
	return Mt(e)(t, n, i);
}, Gt = (e) => async (t, n, r) => Mt(e)(t, n, r), Kt = /^[cC][0-9a-z]{6,}$/, qt = /^[0-9a-z]+$/, Jt = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/, Yt = /^[0-9a-vA-V]{20}$/, Xt = /^[A-Za-z0-9]{27}$/, Zt = /^[a-zA-Z0-9_-]{21}$/;
function Qt(e) {
	return RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
var $t = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/, en = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/, tn = (e) => e ? RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/, nn = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/, rn = "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
function an() {
	return new RegExp(rn, "u");
}
var on = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, sn = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/, cn = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/, ln = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, un = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/, dn = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/, fn = /^https?$/, pn = /^\+[1-9]\d{6,14}$/, mn = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
function hn(e) {
	return RegExp(`^${e}$`);
}
var gn = /*@__PURE__*/ hn(mn);
function _n(e) {
	let t = "(?:[01]\\d|2[0-3]):[0-5]\\d";
	return typeof e.precision == "number" ? e.precision === -1 ? `${t}` : e.precision === 0 ? `${t}:[0-5]\\d` : `${t}:[0-5]\\d\\.\\d{${e.precision}}` : e.seconds ? `${t}:[0-5]\\d(?:\\.\\d+)?` : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
}
function vn(e) {
	return RegExp(`^${_n(e)}$`);
}
function yn(e) {
	let t = ["Z"];
	e.offset && t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
	let n = `${_n({
		precision: e.precision,
		seconds: !0
	})}(?:${t.join("|")})`, r = e.local ? `${n}|${_n({ precision: e.precision })}` : n;
	return RegExp(`^${mn}T(?:${r})$`);
}
var bn = /^[\s\S]{0,}$/, xn = /^-?\d+$/, Sn = /^-?\d+(?:\.\d+)?$/, Cn = /^(?:true|false)$/i, wn = /^null$/i, Tn = /^[^A-Z]*$/, En = /^[^a-z]*$/, N = /*@__PURE__*/ A("$ZodCheck", (e, t) => {
	var n;
	e._zod ??= {}, e._zod.def = t, (n = e._zod).onattach ?? (n.onattach = []);
}), Dn = (e) => {
	let t = e.value;
	return !pe(t) && t.length !== void 0;
}, On = {
	number: "number",
	bigint: "bigint",
	object: "date"
}, kn = /*@__PURE__*/ A("$ZodCheckLessThan", (e, t) => {
	N.init(e, t);
	let n = On[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value <= t.value : r.value < t.value) || r.issues.push({
			origin: On[typeof r.value] ?? n,
			code: "too_big",
			maximum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), An = /*@__PURE__*/ A("$ZodCheckGreaterThan", (e, t) => {
	N.init(e, t);
	let n = On[typeof t.value];
	e._zod.check = (r) => {
		(t.inclusive ? r.value >= t.value : r.value > t.value) || r.issues.push({
			origin: On[typeof r.value] ?? n,
			code: "too_small",
			minimum: typeof t.value == "object" ? t.value.getTime() : t.value,
			input: r.value,
			inclusive: t.inclusive,
			inst: e,
			continue: !t.abort
		});
	};
}), jn = /*@__PURE__*/ A("$ZodCheckMultipleOf", (e, t) => {
	N.init(e, t), e._zod.check = (n) => {
		if (typeof n.value != typeof t.value) throw Error("Cannot mix number and bigint in multiple_of check.");
		(typeof n.value == "bigint" ? t.value !== BigInt(0) && n.value % t.value === BigInt(0) : he(n.value, t.value) === 0) || n.issues.push({
			origin: typeof n.value,
			code: "not_multiple_of",
			divisor: t.value,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Mn = /*@__PURE__*/ A("$ZodCheckNumberFormat", (e, t) => {
	N.init(e, t), t.format = t.format || "float64";
	let n = t.format?.includes("int"), r = n ? "int" : "number", [i, a] = Ne[t.format];
	e._zod.check = (o) => {
		let s = o.value;
		if (n) {
			if (!Number.isInteger(s)) {
				o.issues.push({
					expected: r,
					format: t.format,
					code: "invalid_type",
					continue: !1,
					input: s,
					inst: e
				});
				return;
			}
			if (!Number.isSafeInteger(s)) {
				s > 0 ? o.issues.push({
					input: s,
					code: "too_big",
					maximum: 2 ** 53 - 1,
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				}) : o.issues.push({
					input: s,
					code: "too_small",
					minimum: -(2 ** 53 - 1),
					note: "Integers must be within the safe integer range.",
					inst: e,
					origin: r,
					inclusive: !0,
					continue: !t.abort
				});
				return;
			}
		}
		s < i && o.issues.push({
			origin: "number",
			input: s,
			code: "too_small",
			minimum: i,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		}), s > a && o.issues.push({
			origin: "number",
			input: s,
			code: "too_big",
			maximum: a,
			inclusive: !0,
			inst: e,
			continue: !t.abort
		});
	};
}), Nn = /*@__PURE__*/ A("$ZodCheckMaxLength", (e, t) => {
	var n;
	N.init(e, t), (n = e._zod.def).when ?? (n.when = Dn), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i > t.maximum ? Xe(r) : i) <= t.maximum) return;
		let a = Ze(r);
		n.issues.push({
			origin: a,
			code: "too_big",
			maximum: t.maximum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), Pn = /*@__PURE__*/ A("$ZodCheckMinLength", (e, t) => {
	var n;
	N.init(e, t), (n = e._zod.def).when ?? (n.when = Dn), e._zod.check = (n) => {
		let r = n.value, i = r.length;
		if ((typeof r == "string" && i >= t.minimum && i < t.minimum * 2 ? Xe(r) : i) >= t.minimum) return;
		let a = Ze(r);
		n.issues.push({
			origin: a,
			code: "too_small",
			minimum: t.minimum,
			inclusive: !0,
			input: r,
			inst: e,
			continue: !t.abort
		});
	};
}), Fn = /*@__PURE__*/ A("$ZodCheckLengthEquals", (e, t) => {
	var n;
	N.init(e, t), (n = e._zod.def).when ?? (n.when = Dn), e._zod.check = (n) => {
		let r = n.value, i = r.length, a = typeof r == "string" && i >= t.length && i <= t.length * 2 ? Xe(r) : i;
		if (a === t.length) return;
		let o = Ze(r), s = a > t.length;
		n.issues.push({
			origin: o,
			...s ? {
				code: "too_big",
				maximum: t.length
			} : {
				code: "too_small",
				minimum: t.length
			},
			inclusive: !0,
			exact: !0,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), In = /*@__PURE__*/ A("$ZodCheckStringFormat", (e, t) => {
	var n, r;
	N.init(e, t), t.pattern ? (n = e._zod).check ?? (n.check = (n) => {
		t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: t.format,
			input: n.value,
			...t.pattern ? { pattern: t.pattern.toString() } : {},
			inst: e,
			continue: !t.abort
		});
	}) : (r = e._zod).check ?? (r.check = () => {});
}), Ln = /*@__PURE__*/ A("$ZodCheckRegex", (e, t) => {
	In.init(e, t), e._zod.check = (n) => {
		t.pattern.lastIndex = 0, !t.pattern.test(n.value) && n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			input: n.value,
			pattern: t.pattern.toString(),
			inst: e,
			continue: !t.abort
		});
	};
}), Rn = /*@__PURE__*/ A("$ZodCheckLowerCase", (e, t) => {
	t.pattern ??= Tn, In.init(e, t);
}), zn = /*@__PURE__*/ A("$ZodCheckUpperCase", (e, t) => {
	t.pattern ??= En, In.init(e, t);
}), Bn = /*@__PURE__*/ A("$ZodCheckIncludes", (e, t) => {
	N.init(e, t);
	let n = ke(t.includes);
	t.pattern = new RegExp(typeof t.position == "number" ? `^.{${t.position},}${n}` : n), e._zod.check = (n) => {
		n.value.includes(t.includes, t.position) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "includes",
			includes: t.includes,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Vn = /*@__PURE__*/ A("$ZodCheckStartsWith", (e, t) => {
	N.init(e, t);
	let n = RegExp(`^${ke(t.prefix)}.*`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.startsWith(t.prefix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "starts_with",
			prefix: t.prefix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Hn = /*@__PURE__*/ A("$ZodCheckEndsWith", (e, t) => {
	N.init(e, t);
	let n = RegExp(`.*${ke(t.suffix)}$`);
	t.pattern ??= n, e._zod.check = (n) => {
		n.value.endsWith(t.suffix) || n.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "ends_with",
			suffix: t.suffix,
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Un = /*@__PURE__*/ A("$ZodCheckOverwrite", (e, t) => {
	N.init(e, t), e._zod.check = (e) => {
		e.value = t.tx(e.value);
	};
}), Wn = class {
	constructor(e = [], t = {}) {
		this.content = [], this.indent = 0, this.args = e, this.closed = t;
	}
	indented(e) {
		this.indent += 1;
		try {
			e(this);
		} finally {
			--this.indent;
		}
	}
	write(e) {
		if (typeof e == "function") {
			e(this, { execution: "sync" }), e(this, { execution: "async" });
			return;
		}
		let t = e.split("\n").filter((e) => e), n = Math.min(...t.map((e) => e.length - e.trimStart().length)), r = t.map((e) => e.slice(n)).map((e) => " ".repeat(this.indent * 2) + e);
		for (let e of r) this.content.push(e);
	}
	compile() {
		let e = Function, t = this?.content ?? [""];
		return new e(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${t.join("\n")}\n};`)(...Object.values(this.closed));
	}
}, Gn = {
	major: 4,
	minor: 6,
	patch: 5
}, P = /*@__PURE__*/ A("$ZodType", (e, t) => {
	var n;
	e ??= {}, e._zod.def = t, e._zod.bag = e._zod.bag || {}, e._zod.version = Gn;
	let r = e._zod.def.checks, i = e._zod.traits.has("$ZodCheck") ? [e, ...r ?? []] : r?.length ? [...r] : [];
	for (let t of i) for (let n of t._zod.onattach) n(e);
	if (i.length === 0) (n = e._zod).deferred ?? (n.deferred = []), e._zod.deferred?.push(() => {
		e._zod.run = e._zod.parse;
	});
	else {
		let t = (t, n, r) => {
			if (t.memo) return t;
			let i = D(t), a;
			for (let o of n) {
				if (o._zod.def.when) {
					if (We(t) || !o._zod.def.when(t)) continue;
				} else if (i) continue;
				let n = t.issues.length, s = o._zod.check(t);
				if (s instanceof Promise && r?.async === !1) throw new ht();
				if (a || s instanceof Promise) a = (a ?? Promise.resolve()).then(async () => {
					await s, t.issues.length !== n && (qe(t.issues, n, e), i ||= D(t, n));
				});
				else {
					if (t.issues.length === n) continue;
					qe(t.issues, n, e), i ||= D(t, n);
				}
			}
			return a ? a.then(() => t) : t;
		}, n = (n, r, a) => {
			if (D(n)) return n.aborted = !0, n;
			let o = t(r, i, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new ht();
				return o.then((t) => e._zod.parse(t, a));
			}
			return e._zod.parse(o, a);
		};
		e._zod.run = (r, a) => {
			if (a.skipChecks) return e._zod.parse(r, a);
			if (a.direction === "backward") {
				let t = e._zod.parse({
					value: r.value,
					issues: []
				}, {
					...a,
					skipChecks: !0
				});
				return t instanceof Promise ? t.then((e) => n(e, r, a)) : n(t, r, a);
			}
			let o = e._zod.parse(r, a);
			if (o instanceof Promise) {
				if (a.async === !1) throw new ht();
				return o.then((e) => t(e, i, a));
			}
			return t(o, i, a);
		};
	}
}, {
	get "~standard"() {
		return tt(this, "~standard", Jn(this));
	},
	set "~standard"(e) {
		O(this, "~standard", e);
	}
}), Kn = (e, t) => e.issues.length ? { issues: e.issues.map((e) => Je(e, t, M())) } : { value: e.value };
async function qn(e, t) {
	let n = { async: !0 };
	return Kn(await e._zod.run({
		value: t,
		issues: []
	}, n), n);
}
function Jn(e) {
	return {
		validate: (t) => {
			let n = { async: !1 };
			try {
				let r = e._zod.run({
					value: t,
					issues: []
				}, n);
				if (!(r instanceof Promise)) return Kn(r, n);
			} catch {}
			return qn(e, t);
		},
		vendor: "zod",
		version: 1
	};
}
var Yn = /*@__PURE__*/ A("$ZodString", (e, t) => {
	P.init(e, t), e._zod.pattern = t.pattern ?? bn, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = String(n.value);
		} catch {}
		return typeof n.value == "string" || n.issues.push({
			expected: "string",
			code: "invalid_type",
			input: n.value,
			inst: e
		}), n;
	};
}), F = /*@__PURE__*/ A("$ZodStringFormat", (e, t) => {
	In.init(e, t), Yn.init(e, t);
}), Xn = /*@__PURE__*/ A("$ZodGUID", (e, t) => {
	t.pattern ??= en, F.init(e, t);
}), Zn = /*@__PURE__*/ A("$ZodUUID", (e, t) => {
	if (t.version) {
		let e = {
			v1: 1,
			v2: 2,
			v3: 3,
			v4: 4,
			v5: 5,
			v6: 6,
			v7: 7,
			v8: 8
		}[t.version];
		if (e === void 0) throw Error(`Invalid UUID version: "${t.version}"`);
		t.pattern ??= tn(e);
	} else t.pattern ??= tn();
	F.init(e, t);
}), Qn = /*@__PURE__*/ A("$ZodEmail", (e, t) => {
	t.pattern ??= nn, F.init(e, t);
});
function $n(e) {
	try {
		return typeof URL < "u" && typeof URL.canParse == "function" ? URL.canParse(e) : (new URL(e), !0);
	} catch {
		return !1;
	}
}
function er(e, t) {
	return !("normalize" in t) && !("hostname" in t) && !("protocol" in t) ? $n(e) || 2 : tr(e, t);
}
function tr(e, t) {
	if (!t.normalize && t.protocol?.source === fn.source && !/^https?:\/\//i.test(e)) return 1;
	try {
		if (typeof URL < "u") {
			let t = URL;
			if (typeof t.parse == "function") return t.parse(e) ?? 2;
		}
		return new URL(e);
	} catch {
		return 2;
	}
}
var nr = /[\t\n\r]/g;
function rr(e) {
	return e.replace(nr, "");
}
function ir(e, t) {
	return t.lastIndex = 0, t.test(e.hostname);
}
function ar(e, t) {
	return t.lastIndex = 0, t.test(e.protocol.endsWith(":") ? e.protocol.slice(0, -1) : e.protocol);
}
var or = /*@__PURE__*/ A("$ZodURL", (e, t) => {
	F.init(e, t), e._zod.check = (n) => {
		try {
			let r = n.value.trim(), i = er(r, t);
			if (i === 1) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					note: "Invalid URL format",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === 2) {
				n.issues.push({
					code: "invalid_format",
					format: "url",
					input: n.value,
					inst: e,
					continue: !t.abort
				});
				return;
			}
			if (i === !0) {
				n.value = rr(r);
				return;
			}
			t.hostname && !ir(i, t.hostname) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid hostname",
				pattern: t.hostname.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), t.protocol && !ar(i, t.protocol) && n.issues.push({
				code: "invalid_format",
				format: "url",
				note: "Invalid protocol",
				pattern: t.protocol.source,
				input: n.value,
				inst: e,
				continue: !t.abort
			}), n.value = t.normalize ? i.href : rr(r);
			return;
		} catch {
			n.issues.push({
				code: "invalid_format",
				format: "url",
				input: n.value,
				inst: e,
				continue: !t.abort
			});
		}
	};
}), sr = /*@__PURE__*/ A("$ZodEmoji", (e, t) => {
	t.pattern ??= an(), F.init(e, t);
}), cr = /*@__PURE__*/ A("$ZodNanoID", (e, t) => {
	if (t.length !== void 0 && (!Number.isInteger(t.length) || t.length < 1)) throw Error(`Invalid nanoid length: ${t.length}`);
	t.pattern ??= t.length === void 0 ? Zt : Qt(t.length), F.init(e, t);
}), lr = /*@__PURE__*/ A("$ZodCUID", (e, t) => {
	t.pattern ??= Kt, F.init(e, t);
}), ur = /*@__PURE__*/ A("$ZodCUID2", (e, t) => {
	t.pattern ??= qt, F.init(e, t);
}), dr = /*@__PURE__*/ A("$ZodULID", (e, t) => {
	t.pattern ??= Jt, F.init(e, t);
}), fr = /*@__PURE__*/ A("$ZodXID", (e, t) => {
	t.pattern ??= Yt, F.init(e, t);
}), pr = /*@__PURE__*/ A("$ZodKSUID", (e, t) => {
	t.pattern ??= Xt, F.init(e, t);
}), mr = /*@__PURE__*/ A("$ZodISODateTime", (e, t) => {
	t.pattern ??= yn(t), F.init(e, t);
}), hr = /*@__PURE__*/ A("$ZodISODate", (e, t) => {
	t.pattern ??= gn, F.init(e, t);
}), gr = /*@__PURE__*/ A("$ZodISOTime", (e, t) => {
	t.pattern ??= vn(t), F.init(e, t);
}), _r = /*@__PURE__*/ A("$ZodISODuration", (e, t) => {
	t.pattern ??= $t, F.init(e, t);
}), vr = /*@__PURE__*/ A("$ZodIPv4", (e, t) => {
	t.pattern ??= on, F.init(e, t);
}), yr = /^[0-9a-fA-F:.]+$/;
function br(e) {
	return yr.test(e) ? $n(`http://[${e}]`) : !1;
}
var xr = /*@__PURE__*/ A("$ZodIPv6", (e, t) => {
	t.pattern ??= sn, F.init(e, t), e._zod.check = (n) => {
		br(n.value) || n.issues.push({
			code: "invalid_format",
			format: "ipv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Sr = /*@__PURE__*/ A("$ZodCIDRv4", (e, t) => {
	t.pattern ??= cn, F.init(e, t);
});
function Cr(e) {
	let t = e.split("/");
	if (t.length !== 2) return !1;
	let [n, r] = t;
	if (!r) return !1;
	let i = Number(r);
	return `${i}` !== r || i < 0 || i > 128 ? !1 : br(n);
}
var wr = /*@__PURE__*/ A("$ZodCIDRv6", (e, t) => {
	t.pattern ??= ln, F.init(e, t), e._zod.check = (n) => {
		Cr(n.value) || n.issues.push({
			code: "invalid_format",
			format: "cidrv6",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
});
function Tr(e) {
	if (e === "") return !0;
	if (/\s/.test(e) || e.length % 4 != 0) return !1;
	try {
		return atob(e), !0;
	} catch {
		return !1;
	}
}
var Er = /^[0-9a-zA-Z+/]*={0,2}$/, Dr = /*@__PURE__*/ A("$ZodBase64", (e, t) => {
	t.pattern ??= Er, F.init(e, t), e._zod.check = (n) => {
		Tr(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Or = /^[A-Za-z0-9_-]*$/;
function kr(e) {
	if (!Or.test(e)) return !1;
	let t = e.replace(/[-_]/g, (e) => e === "-" ? "+" : "/");
	return Tr(t.padEnd(Math.ceil(t.length / 4) * 4, "="));
}
var Ar = /*@__PURE__*/ A("$ZodBase64URL", (e, t) => {
	t.pattern ??= Or, F.init(e, t), e._zod.check = (n) => {
		kr(n.value) || n.issues.push({
			code: "invalid_format",
			format: "base64url",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), jr = /*@__PURE__*/ A("$ZodE164", (e, t) => {
	t.pattern ??= pn, F.init(e, t);
});
function Mr(e, t = null) {
	try {
		let n = e.split(".");
		if (n.length !== 3) return !1;
		let [r] = n;
		if (!r) return !1;
		let i = JSON.parse(atob(r));
		return !("typ" in i && i?.typ !== "JWT" || !i.alg || t && (!("alg" in i) || i.alg !== t));
	} catch {
		return !1;
	}
}
var Nr = /*@__PURE__*/ A("$ZodJWT", (e, t) => {
	F.init(e, t), e._zod.check = (n) => {
		Mr(n.value, t.alg) || n.issues.push({
			code: "invalid_format",
			format: "jwt",
			input: n.value,
			inst: e,
			continue: !t.abort
		});
	};
}), Pr = /*@__PURE__*/ A("$ZodNumber", (e, t) => {
	P.init(e, t), e._zod.pattern = Sn, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = Number(n.value);
		} catch {}
		let i = n.value;
		if (typeof i == "number" && !Number.isNaN(i) && Number.isFinite(i)) return n;
		let a = typeof i == "number" ? Number.isNaN(i) ? "NaN" : Number.isFinite(i) ? void 0 : String(i) : void 0;
		return n.issues.push({
			expected: "number",
			code: "invalid_type",
			input: i,
			inst: e,
			...a ? { received: a } : {}
		}), n;
	};
}), Fr = /*@__PURE__*/ A("$ZodNumberFormat", (e, t) => {
	Mn.init(e, t), Pr.init(e, t);
}), Ir = /*@__PURE__*/ A("$ZodBoolean", (e, t) => {
	P.init(e, t), e._zod.pattern = Cn, e._zod.parse = (n, r) => {
		if (t.coerce) try {
			n.value = !!n.value;
		} catch {}
		let i = n.value;
		return typeof i == "boolean" || n.issues.push({
			expected: "boolean",
			code: "invalid_type",
			input: i,
			inst: e
		}), n;
	};
}), Lr = /*@__PURE__*/ A("$ZodNull", (e, t) => {
	P.init(e, t), e._zod.pattern = wn, e._zod.values = /* @__PURE__ */ new Set([null]), e._zod.parse = (t, n) => {
		let r = t.value;
		return r === null || t.issues.push({
			expected: "null",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
	};
}), Rr = /*@__PURE__*/ A("$ZodAny", (e, t) => {
	P.init(e, t), e._zod.parse = (e) => e;
}), zr = /*@__PURE__*/ A("$ZodUnknown", (e, t) => {
	P.init(e, t), e._zod.parse = (e) => e;
}), Br = /*@__PURE__*/ A("$ZodNever", (e, t) => {
	P.init(e, t), e._zod.parse = (t, n) => (t.issues.push({
		expected: "never",
		code: "invalid_type",
		input: t.value,
		inst: e
	}), t);
});
function Vr(e, t, n) {
	e.issues.length && t.issues.push(...Ge(n, e.issues)), t.value[n] = e.value;
}
var Hr = /*@__PURE__*/ A("$ZodArray", (e, t) => {
	P.init(e, t);
	let n = j.memoizer;
	n?.attach(e), e._zod.parse = (r, i) => {
		let a = r.value;
		if (!Array.isArray(a)) return r.issues.push({
			expected: "array",
			code: "invalid_type",
			input: a,
			inst: e
		}), r;
		r.value = n ? n.alloc(e, r, Array(a.length), i) : Array(a.length);
		let o = [], s = i?.abortEarly;
		for (let e = 0; e < a.length; e++) {
			let n = a[e], c = t.element._zod.run({
				value: n,
				issues: []
			}, i);
			if (c instanceof Promise) o.push(c.then((t) => Vr(t, r, e)));
			else if (Vr(c, r, e), s && c.issues.length !== 0 && D(c)) break;
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	};
});
function Ur(e, t, n, r, i, a) {
	let o = n in r, s = a === "optional";
	if (o || !s || i !== "optional") {
		if (e.issues.length) {
			if (i !== void 0 && s && !o) return;
			t.issues.push(...Ge(n, e.issues));
		}
		if (!o && i === void 0) {
			e.issues.length || t.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: void 0,
				path: [n]
			});
			return;
		}
		e.value === void 0 ? (o || i === "defaulted" && !s) && (t.value[n] = void 0) : t.value[n] = e.value;
	}
}
var Wr = [];
function Gr(e) {
	let t = Object.keys(e.shape), n = Object.getOwnPropertySymbols(e.shape), r = n.length ? n : Wr, i = r.length ? [...t, ...r] : t;
	for (let t of i) if (!e.shape?.[t]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${String(t)}": expected a Zod schema`);
	let a = Me(e.shape);
	return {
		...e,
		allKeys: i,
		symbolKeys: r,
		keySet: new Set(t),
		numKeys: t.length,
		optionalKeys: new Set(a)
	};
}
function Kr(e, t, n, r, i, a, o) {
	let s = [], c = i.keySet, l = i.catchall._zod, u = l.def.type, d = l.optin, f = l.optout, p = 0;
	for (let i in t) {
		if (o && n.issues.length !== p) {
			if (D(n, p)) break;
			p = n.issues.length;
		}
		if (c.has(i)) continue;
		if (i === "__proto__") {
			u === "never" && s.push(i);
			continue;
		}
		if (u === "never") {
			s.push(i);
			continue;
		}
		let a = l.run({
			value: t[i],
			issues: []
		}, r);
		a instanceof Promise ? e.push(a.then((e) => Ur(e, n, i, t, d, f))) : Ur(a, n, i, t, d, f);
	}
	return s.length && n.issues.push({
		code: "unrecognized_keys",
		keys: s,
		input: t,
		inst: a,
		continue: !0
	}), e.length ? Promise.all(e).then(() => n) : n;
}
var qr = /*@__PURE__*/ A("$ZodObject", (e, t) => {
	P.init(e, t);
	let n = Object.getOwnPropertyDescriptor(t, "shape"), r = n?.get ? n.get.raw : t.shape ?? {};
	if (r) {
		let e = () => {
			let n = { ...r };
			return Object.defineProperty(t, "shape", { value: n }), e.raw = n, n;
		};
		e.raw = r, Object.defineProperty(t, "shape", { get: e });
	}
	let i = fe(() => Gr(t));
	k(e, "propValues", (e) => {
		let t = e.def.shape, n = {};
		for (let e in t) {
			let r = t[e]._zod;
			if (r.values) {
				Object.prototype.hasOwnProperty.call(n, e) || C(n, e, /* @__PURE__ */ new Set());
				for (let t of r.values) n[e].add(t);
				r.optin !== void 0 && n[e].add(void 0);
			}
		}
		return n;
	});
	let a = we, o = t.catchall, s, c = j.memoizer;
	c?.attach(e), e._zod.parse = (t, n) => {
		s ??= i.value;
		let r = t.value;
		if (!a(r)) return t.issues.push({
			expected: "object",
			code: "invalid_type",
			input: r,
			inst: e
		}), t;
		t.value = c ? c.alloc(e, t, {}, n) : {};
		let l = [], u = s.shape, d = n?.abortEarly, f = t.issues.length;
		for (let e of s.allKeys) {
			if (d && t.issues.length !== f) {
				if (D(t, f)) break;
				f = t.issues.length;
			}
			if (e === "__proto__") continue;
			let i = u[e], a = i._zod.optin, o = i._zod.optout, s = i._zod.run({
				value: r[e],
				issues: []
			}, n);
			s instanceof Promise ? l.push(s.then((n) => Ur(n, t, e, r, a, o))) : Ur(s, t, e, r, a, o);
		}
		return o ? Kr(l, r, t, n, i.value, e, d === !0) : l.length ? Promise.all(l).then(() => t) : t;
	};
}), Jr = /*@__PURE__*/ A("$ZodObjectJIT", (e, t) => {
	qr.init(e, t);
	let n = e._zod.parse, r = fe(() => Gr(t)), i = j.memoizer, a = (t) => {
		let n = r.value, a = n.symbolKeys, o = new Wn(["payload", "ctx"], {
			shape: t,
			inst: e,
			memo: i,
			syms: a
		}), s = (e) => `shape[${e}]._zod.run({ value: input[${e}], issues: [] }, ctx)`, c = (e, t) => `
          let ${e}_ab = false;
          for (let i = 0; i < ${e}.issues.length; i++) {
            const iss = ${e}.issues[i];
            iss.path = iss.path ? [${t}, ...iss.path] : [${t}];
            payload.issues.push(iss);
            if (iss.continue !== true) ${e}_ab = true;
          }
          if (${e}_ab && ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }`;
		o.write("const input = payload.value;");
		let l = Object.create(null), u = 0;
		for (let e of n.allKeys) l[e] = `key_${u++}`;
		o.write(i ? "const newResult = memo.alloc(inst, payload, {}, ctx);" : "const newResult = {};");
		for (let e of n.allKeys) {
			if (e === "__proto__") continue;
			let n = l[e], r = typeof e == "symbol" ? `syms[${a.indexOf(e)}]` : xe(e), i = `${r} in input`, u = t[e], d = u?._zod?.optin, f = d !== void 0, p = u?._zod?.optout === "optional";
			if (o.write(`const ${n} = ${s(r)};`), f && p) {
				let e = d === "optional" ? `${n}_present` : `${n}.value !== undefined || ${n}_present`;
				o.write(`
        const ${n}_present = ${i};
        if (!${n}.issues.length || ${n}_present) {
          if (${n}.issues.length) {${c(n, r)}
          }

          if (${e}) {
            newResult[${r}] = ${n}.value;
          }
        }

      `);
			} else f ? (o.write(`
        if (${n}.issues.length) {${c(n, r)}
        }
      `), d === "defaulted" ? o.write(`newResult[${r}] = ${n}.value;`) : o.write(`
        if (${n}.value !== undefined || ${i}) {
          newResult[${r}] = ${n}.value;
        }
      `)) : o.write(`
        const ${n}_present = ${i};
        if (${n}.issues.length) {${c(n, r)}
        }
        if (!${n}_present && !${n}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${r}]
          });
          if (ctx && ctx.abortEarly) {
            payload.value = newResult;
            return payload;
          }
        }

        if (${n}_present) {
          newResult[${r}] = ${n}.value;
        }

      `);
		}
		return o.write("payload.value = newResult;"), o.write("return payload;"), o.compile();
	}, o, s = we, c = !j.jitless, l = c && Te.value, u = t.catchall, d;
	e._zod.parse = (i, f) => {
		d ??= r.value;
		let p = i.value;
		return s(p) ? c && l && f?.async === !1 && f.jitless !== !0 ? (o ||= a(t.shape), i = o(i, f), u ? Kr([], p, i, f, d, e, f?.abortEarly === !0) : i) : n(i, f) : (i.issues.push({
			expected: "object",
			code: "invalid_type",
			input: p,
			inst: e
		}), i);
	};
});
function Yr(e, t, n, r) {
	for (let n of e) if (n.issues.length === 0) return t.value = n.value, t;
	let i = e.filter((e) => !D(e));
	return i.length === 1 ? (t.value = i[0].value, i[0]) : (t.issues.push({
		code: "invalid_union",
		input: t.value,
		inst: n,
		errors: e.map((e) => e.issues.map((e) => Je(e, r, M())))
	}), t);
}
var Xr = /*@__PURE__*/ A("$ZodUnion", (e, t) => {
	P.init(e, t), k(e, "optin", (e) => e.def.options.some((e) => e._zod.optin === "defaulted") ? "defaulted" : e.def.options.some((e) => e._zod.optin !== void 0) ? "optional" : void 0), k(e, "optout", (e) => e.def.options.some((e) => e._zod.optout === "optional") ? "optional" : void 0), k(e, "values", (e) => {
		if (e.def.options.every((e) => e._zod.values)) return new Set(e.def.options.flatMap((e) => Array.from(e._zod.values)));
	}), k(e, "pattern", (e) => {
		if (e.def.options.every((e) => e._zod.pattern)) {
			let t = e.def.options.map((e) => e._zod.pattern);
			return RegExp(`^(${t.map((e) => me(e.source)).join("|")})$`);
		}
	});
	let n = t.options.length === 1 ? t.options[0]._zod.run : null;
	e._zod.parse = (r, i) => {
		if (n) return n(r, i);
		let a = !1, o = [];
		for (let e of t.options) {
			let t = e._zod.run({
				value: r.value,
				issues: []
			}, i);
			if (t instanceof Promise) o.push(t), a = !0;
			else {
				if (t.issues.length === 0) return t;
				o.push(t);
			}
		}
		return a ? Promise.all(o).then((t) => Yr(t, r, e, i)) : Yr(o, r, e, i);
	};
}), Zr = /*@__PURE__*/ A("$ZodIntersection", (e, t) => {
	P.init(e, t), e._zod.parse = (e, n) => {
		let r = e.value, i = t.left._zod.run({
			value: r,
			issues: []
		}, n), a = t.right._zod.run({
			value: r,
			issues: []
		}, n);
		return i instanceof Promise || a instanceof Promise ? Promise.all([i, a]).then(([t, n]) => $r(e, t, n)) : $r(e, i, a);
	};
});
function Qr(e, t) {
	if (e === t || e instanceof Date && t instanceof Date && +e == +t) return {
		valid: !0,
		data: e
	};
	if (Ee(e) && Ee(t)) {
		let n = Object.keys(t), r = Object.keys(e).filter((e) => n.indexOf(e) !== -1), i = {
			...e,
			...t
		};
		Object.prototype.hasOwnProperty.call(i, "__proto__") && delete i.__proto__;
		for (let n of r) {
			if (n === "__proto__") continue;
			let r = Qr(e[n], t[n]);
			if (!r.valid) return {
				valid: !1,
				mergeErrorPath: [n, ...r.mergeErrorPath]
			};
			i[n] = r.data;
		}
		return {
			valid: !0,
			data: i
		};
	}
	if (Array.isArray(e) && Array.isArray(t)) {
		if (e.length !== t.length) return {
			valid: !1,
			mergeErrorPath: []
		};
		let n = [];
		for (let r = 0; r < e.length; r++) {
			let i = e[r], a = t[r], o = Qr(i, a);
			if (!o.valid) return {
				valid: !1,
				mergeErrorPath: [r, ...o.mergeErrorPath]
			};
			n.push(o.data);
		}
		return {
			valid: !0,
			data: n
		};
	}
	return {
		valid: !1,
		mergeErrorPath: []
	};
}
function $r(e, t, n) {
	let r = /* @__PURE__ */ new Map(), i, a = /* @__PURE__ */ new Map(), o = (e, t) => {
		let n;
		if (e.code === "unrecognized_keys" && !e.path?.length) i ??= e, n = e.keys;
		else if (e.code === "invalid_key" && e.origin === "record" && e.path?.length === 1) {
			let t = String(e.path[0]);
			a.has(t) || a.set(t, e), n = [t];
		} else return !1;
		for (let e of n) r.has(e) || r.set(e, {}), r.get(e)[t] = !0;
		return !0;
	};
	for (let n of t.issues) o(n, "l") || e.issues.push(n);
	for (let t of n.issues) o(t, "r") || e.issues.push(t);
	let s = [...r].filter(([, e]) => e.l && e.r).map(([e]) => e);
	if (s.length) {
		let t = i ? s.filter((e) => i.keys.includes(e)) : [];
		t.length && e.issues.push({
			...i,
			keys: t
		});
		for (let n of s) !t.includes(n) && a.has(n) && e.issues.push(a.get(n));
	}
	let c = Qr(t.value, n.value);
	if (!c.valid) {
		if (D(e)) return e;
		throw Error(`Unmergable intersection. Error path: ${JSON.stringify(c.mergeErrorPath)}`);
	}
	return e.value = c.data, e;
}
var ei = /*@__PURE__*/ A("$ZodRecord", (e, t) => {
	P.init(e, t);
	let n = j.memoizer;
	n?.attach(e), e._zod.parse = (r, i) => {
		let a = r.value;
		if (!Ee(a)) return r.issues.push({
			expected: "record",
			code: "invalid_type",
			input: a,
			inst: e
		}), r;
		let o = [], s = t.keyType._zod.values;
		if (s && !t.partial) {
			r.value = n ? n.alloc(e, r, {}, i) : {};
			let c = /* @__PURE__ */ new Set();
			for (let n of s) if (typeof n == "string" || typeof n == "number" || typeof n == "symbol") {
				if (c.add(typeof n == "number" ? n.toString() : n), n === "__proto__") continue;
				let s = t.keyType._zod.run({
					value: n,
					issues: []
				}, i);
				if (s instanceof Promise) throw Error("Async schemas not supported in object keys currently");
				if (s.issues.length) {
					r.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: s.issues.map((e) => Je(e, i, M())),
						input: n,
						path: [n],
						inst: e
					});
					continue;
				}
				let l = s.value;
				if (l === "__proto__") continue;
				let u = t.valueType._zod.run({
					value: a[n],
					issues: []
				}, i);
				u instanceof Promise ? o.push(u.then((e) => {
					e.issues.length && r.issues.push(...Ge(n, e.issues)), r.value[l] = e.value;
				})) : (u.issues.length && r.issues.push(...Ge(n, u.issues)), r.value[l] = u.value);
			}
			let l;
			for (let e in a) if (!c.has(e)) {
				if (t.mode === "loose") {
					if (e === "__proto__") continue;
					r.value[e] = a[e];
				} else l ??= [], l.push(e);
			}
			l && l.length > 0 && r.issues.push({
				code: "unrecognized_keys",
				input: a,
				inst: e,
				keys: l,
				continue: !0
			});
		} else {
			r.value = n ? n.alloc(e, r, {}, i) : {};
			let c;
			for (let n of Reflect.ownKeys(a)) {
				if (n === "__proto__" || !Object.prototype.propertyIsEnumerable.call(a, n)) continue;
				let l = t.keyType._zod.run({
					value: n,
					issues: []
				}, i);
				if (l instanceof Promise) throw Error("Async schemas not supported in object keys currently");
				if (typeof n == "string" && Sn.test(n) && l.issues.length) {
					let e = t.keyType._zod.run({
						value: Number(n),
						issues: []
					}, i);
					if (e instanceof Promise) throw Error("Async schemas not supported in object keys currently");
					e.issues.length === 0 && (l = e);
				}
				if (l.issues.length) {
					t.mode === "loose" ? r.value[n] = a[n] : s ? (c ??= [], c.push(n)) : r.issues.push({
						code: "invalid_key",
						origin: "record",
						issues: l.issues.map((e) => Je(e, i, M())),
						input: n,
						path: [n],
						inst: e
					});
					continue;
				}
				let u = l.value;
				if (u === "__proto__") continue;
				let d = t.valueType._zod.run({
					value: a[n],
					issues: []
				}, i);
				d instanceof Promise ? o.push(d.then((e) => {
					e.issues.length && r.issues.push(...Ge(n, e.issues)), r.value[u] = e.value;
				})) : (d.issues.length && r.issues.push(...Ge(n, d.issues)), r.value[u] = d.value);
			}
			c && c.length > 0 && r.issues.push({
				code: "unrecognized_keys",
				input: a,
				inst: e,
				keys: c,
				continue: !0
			});
		}
		return o.length ? Promise.all(o).then(() => r) : r;
	};
}), ti = /*@__PURE__*/ A("$ZodEnum", (e, t) => {
	P.init(e, t);
	let n = ce(t.entries), r = new Set(n);
	e._zod.values = r, k(e, "pattern", (e) => {
		let t = ce(e.def.entries).filter((e) => Oe.has(typeof e));
		return RegExp(t.length ? `^(${t.map((e) => ke(e.toString())).join("|")})$` : "^[^\\s\\S]$");
	}), e._zod.parse = (t, i) => {
		let a = t.value;
		return r.has(a) || t.issues.push({
			code: "invalid_value",
			values: n,
			input: a,
			inst: e
		}), t;
	};
}), ni = /*@__PURE__*/ A("$ZodLiteral", (e, t) => {
	P.init(e, t);
	let n = new Set(t.values);
	e._zod.values = n, k(e, "pattern", (e) => {
		let t = e.def.values;
		return RegExp(t.length ? `^(${t.map((e) => typeof e == "string" ? ke(e) : e ? ke(e.toString()) : String(e)).join("|")})$` : "^[^\\s\\S]$");
	}), e._zod.parse = (r, i) => {
		let a = r.value;
		return n.has(a) || r.issues.push({
			code: "invalid_value",
			values: t.values,
			input: a,
			inst: e
		}), r;
	};
}), ri = /*@__PURE__*/ A("$ZodTransform", (e, t) => {
	P.init(e, t), e._zod.optin = "optional", j.memoizer?.guard(e), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new gt(e.constructor.name);
		let i = t.transform(n.value, n);
		if (r.async) return (i instanceof Promise ? i : Promise.resolve(i)).then((e) => (n.value = e, n));
		if (i instanceof Promise) throw new ht();
		return n.value = i, n;
	};
});
function ii(e, t) {
	return e.value = t.issues.length ? void 0 : t.value, e;
}
var ai = /*@__PURE__*/ A("$ZodOptional", (e, t) => {
	P.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), e._zod.optout = "optional", k(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? /* @__PURE__ */ new Set([...t, void 0]) : void 0;
	}), k(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${me(t.source)})?$`) : void 0;
	}), e._zod.parse = (e, n) => {
		if (e.value === void 0) {
			if (t.innerType._zod.optin !== "defaulted") return e;
			let r = t.innerType._zod.run({
				value: e.value,
				issues: []
			}, n);
			return r instanceof Promise ? r.then((t) => ii(e, t)) : ii(e, r);
		}
		return t.innerType._zod.run(e, n);
	};
}), oi = /*@__PURE__*/ A("$ZodExactOptional", (e, t) => {
	ai.init(e, t), k(e, "values", (e) => e.def.innerType._zod.values), k(e, "pattern", (e) => e.def.innerType._zod.pattern), e._zod.parse = (e, n) => t.innerType._zod.run(e, n);
}), si = /*@__PURE__*/ A("$ZodNullable", (e, t) => {
	P.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin), k(e, "optout", (e) => e.def.innerType._zod.optout), k(e, "pattern", (e) => {
		let t = e.def.innerType._zod.pattern;
		return t ? RegExp(`^(${me(t.source)}|null)$`) : void 0;
	}), k(e, "values", (e) => e.def.innerType._zod.values ? /* @__PURE__ */ new Set([...e.def.innerType._zod.values, null]) : void 0), e._zod.parse = (e, n) => e.value === null ? e : t.innerType._zod.run(e, n);
}), ci = /*@__PURE__*/ A("$ZodDefault", (e, t) => {
	P.init(e, t), e._zod.optin = "defaulted", k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		if (e.value === void 0) return e.value = t.defaultValue, e;
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => li(e, t)) : li(r, t);
	};
});
function li(e, t) {
	return e.value === void 0 && (e.value = t.defaultValue), e;
}
var ui = /*@__PURE__*/ A("$ZodPrefault", (e, t) => {
	P.init(e, t), e._zod.optin = "defaulted", k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => (n.direction === "backward" || e.value === void 0 && (e.value = t.defaultValue), t.innerType._zod.run(e, n));
}), di = /*@__PURE__*/ A("$ZodNonOptional", (e, t) => {
	P.init(e, t), k(e, "values", (e) => {
		let t = e.def.innerType._zod.values;
		return t ? new Set([...t].filter((e) => e !== void 0)) : void 0;
	}), e._zod.parse = (n, r) => {
		let i = t.innerType._zod.run(n, r);
		return i instanceof Promise ? i.then((t) => fi(t, e)) : fi(i, e);
	};
});
function fi(e, t) {
	return !e.issues.length && e.value === void 0 && e.issues.push({
		code: "invalid_type",
		expected: "nonoptional",
		input: e.value,
		inst: t
	}), e;
}
function pi(e, t, n, r) {
	return t.issues.length ? (e.value = n.catchValue({
		...t,
		value: e.value,
		error: { issues: t.issues.map((e) => Je(e, r, M())) },
		input: e.value
	}), e) : (e.value = t.value, t.memo && (e.memo = !0), e);
}
var mi = /*@__PURE__*/ A("$ZodCatch", (e, t) => {
	P.init(e, t), k(e, "optin", (e) => e.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional"), k(e, "optout", (e) => e.def.innerType._zod.optout), k(e, "values", (e) => e.def.innerType._zod.values), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run({
			value: e.value,
			issues: []
		}, n);
		return r instanceof Promise ? r.then((r) => pi(e, r, t, n)) : pi(e, r, t, n);
	};
}), hi = /*@__PURE__*/ A("$ZodPipe", (e, t) => {
	P.init(e, t), k(e, "values", (e) => e.def.in._zod.values), k(e, "optin", (e) => e.def.in._zod.optin), k(e, "optout", (e) => e.def.out._zod.optout), k(e, "propValues", (e) => e.def.in._zod.propValues), e._zod.parse = (e, n) => {
		if (n.direction === "backward") {
			let r = t.out._zod.run(e, n);
			return r instanceof Promise ? r.then((e) => gi(e, t.in, n)) : gi(r, t.in, n);
		}
		let r = t.in._zod.run(e, n);
		return r instanceof Promise ? r.then((e) => gi(e, t.out, n)) : gi(r, t.out, n);
	};
});
function gi(e, t, n) {
	return e.issues.some((e) => e.code !== "unrecognized_keys") ? (e.aborted = !0, e) : t._zod.run({
		value: e.value,
		issues: e.issues
	}, n);
}
var _i = /*@__PURE__*/ A("$ZodReadonly", (e, t) => {
	P.init(e, t), k(e, "propValues", (e) => e.def.innerType._zod.propValues), k(e, "values", (e) => e.def.innerType._zod.values), k(e, "optin", (e) => e.def.innerType?._zod?.optin), k(e, "optout", (e) => e.def.innerType?._zod?.optout), e._zod.parse = (e, n) => {
		if (n.direction === "backward") return t.innerType._zod.run(e, n);
		let r = t.innerType._zod.run(e, n);
		return r instanceof Promise ? r.then(vi) : vi(r);
	};
});
function vi(e) {
	return e.memo || (e.value = Object.freeze(e.value)), e;
}
var yi = /*@__PURE__*/ A("$ZodCustom", (e, t) => {
	N.init(e, t), P.init(e, t), e._zod.parse = (e, t) => e, e._zod.check = (n) => {
		let r = n.value, i = t.fn(r);
		if (i instanceof Promise) return i.then((t) => bi(t, n, r, e));
		bi(i, n, r, e);
	};
});
function bi(e, t, n, r) {
	if (!e) {
		let e = {
			code: "custom",
			input: n,
			inst: r,
			path: [...r._zod.def.path ?? []],
			continue: !r._zod.def.abort
		};
		r._zod.def.params && (e.params = r._zod.def.params), t.issues.push($e(e));
	}
}
//#endregion
//#region web/node_modules/zod/v4/core/memoizer.js
var xi = class extends Error {
	constructor() {
		super("Cannot parse a reference cycle that closes through a transform"), this.name = "ZodCyclicError";
	}
}, Si = "~memo", Ci = [];
function wi(e) {
	return typeof e == "object" && !!e;
}
function Ti(e) {
	return e.map((e) => e.path ? {
		...e,
		path: e.path.slice()
	} : { ...e });
}
var Ei = /*@__PURE__*/ new WeakMap(), Di = 0, Oi = 1, ki = 2;
function Ai(e, t, n) {
	let r = Ei.get(e);
	if (r !== void 0) return r ? ki : Di;
	if (t.has(e)) return ki;
	t.add(e);
	let i = Di, a = (e) => {
		if (i !== ki && e?._zod) {
			let r = Ai(e, t, n);
			r > i && (i = r);
		}
	}, o = (e, r) => {
		let i = Di;
		for (let a of Reflect.ownKeys(e)) {
			let o = Object.getOwnPropertyDescriptor(e, a);
			if (r && !o.enumerable) continue;
			let s = o.get ? Oi : o.value?._zod ? Ai(o.value, t, n) : Di;
			s > i && (i = s);
		}
		return i;
	}, s = (e) => {
		e > i && (i = e);
	}, c = e._zod.def;
	switch (c.type) {
		case "object": {
			let e = ge(c);
			s(e ? o(e, !0) : Oi), a(c.catchall);
			break;
		}
		case "array":
			a(c.element);
			break;
		case "tuple":
			for (let e of c.items) a(e);
			a(c.rest);
			break;
		case "record":
		case "map":
			a(c.keyType), a(c.valueType);
			break;
		case "set":
			a(c.valueType);
			break;
		case "union":
			for (let e of c.options) a(e);
			break;
		case "intersection":
			a(c.left), a(c.right);
			break;
		case "optional":
		case "nullable":
		case "default":
		case "prefault":
		case "catch":
		case "readonly":
		case "nonoptional":
		case "promise":
		case "success":
			a(c.innerType);
			break;
		case "pipe":
			a(c.in), a(c.out);
			break;
		case "function":
			a(c.input), a(c.output);
			break;
		case "lazy": {
			let r = c._cachedInner ?? (n ? e._zod.innerType : void 0);
			s(r ? Ai(r, t, !1) : Oi);
			break;
		}
		case "template_literal":
		case "string":
		case "number":
		case "int":
		case "boolean":
		case "bigint":
		case "symbol":
		case "undefined":
		case "null":
		case "void":
		case "never":
		case "any":
		case "unknown":
		case "date":
		case "nan":
		case "enum":
		case "literal":
		case "file":
		case "transform":
		case "custom": break;
		default: for (let e in c) {
			let t = Object.getOwnPropertyDescriptor(c, e);
			if (!t || t.get) continue;
			let n = t.value;
			if (n && typeof n == "object") {
				if (n._zod) a(n);
				else if (Array.isArray(n)) for (let e of n) a(e);
			}
		}
	}
	return t.delete(e), ji(e, i);
}
function ji(e, t) {
	return t !== Oi && Ei.set(e, t === ki), t;
}
function Mi(e, t) {
	let n = e.buckets.get(t);
	return n || (n = /* @__PURE__ */ new WeakMap(), e.buckets.set(t, n)), n;
}
var Ni, Pi = [], Fi = {
	alloc(e, t, n) {
		let r = Ni;
		if (!r) return n;
		Ni = void 0;
		let i = {
			value: n,
			issues: null
		};
		return r.set(t.value, i), Pi.push(i), n;
	},
	guard(e) {
		var t;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, n = (e, n) => {
				if (n.direction !== "backward" && Li(n, e.value)) throw new xi();
				return t(e, n);
			};
			e._zod.parse = n, e._zod.run === t && (e._zod.run = n);
		});
	},
	attach(e) {
		var t;
		let n, r = !1, i, a;
		(t = e._zod).deferred ?? (t.deferred = []), e._zod.deferred.push(() => {
			let t = e._zod.parse, o = (s, c) => {
				if (n === void 0) {
					let i = Ai(e, /* @__PURE__ */ new Set(), !1);
					if (i === Di) return e._zod.parse = t, e._zod.run === o && (e._zod.run = t), t(s, c);
					i === ki || r ? n = !0 : r = !0;
				}
				let l = s.value;
				if (!wi(l)) return t(s, c);
				let u = c[Si];
				u || (u = {
					buckets: /* @__PURE__ */ new WeakMap(),
					backEdges: void 0
				}, c[Si] = u);
				let d;
				i === c ? d = a : (d = Mi(u, e), i = c, a = d);
				let f = d.get(l);
				if (f) return s.value = f.value, f.issues ? f.issues.length && s.issues.push(...Ti(f.issues)) : (s.memo = !0, u.backEdges ?? (u.backEdges = /* @__PURE__ */ new WeakSet()), u.backEdges.add(f.value)), s;
				Ni = d;
				let p = Pi.length, m = t(s, c);
				Ni = void 0;
				let h = Pi.length > p ? Pi.pop() : void 0;
				return m instanceof Promise ? m.then((e) => (h && (h.issues = e.issues.length ? Ti(e.issues) : Ci), e)) : (h && (h.issues = m.issues.length ? Ti(m.issues) : Ci), m);
			};
			e._zod.parse = o, e._zod.run === t && (e._zod.run = o);
		});
	}
};
function Ii() {
	return Fi;
}
function Li(e, t) {
	let n = e[Si]?.backEdges;
	return n !== void 0 && wi(t) && n.has(t);
}
//#endregion
//#region web/node_modules/zod/v4/locales/en.js
var Ri = () => {
	let e = {
		string: {
			unit: "characters",
			verb: "to have"
		},
		file: {
			unit: "bytes",
			verb: "to have"
		},
		array: {
			unit: "items",
			verb: "to have"
		},
		set: {
			unit: "items",
			verb: "to have"
		},
		map: {
			unit: "entries",
			verb: "to have"
		}
	};
	function t(t) {
		return e[t] ?? null;
	}
	let n = {
		regex: "input",
		email: "email address",
		url: "URL",
		emoji: "emoji",
		uuid: "UUID",
		uuidv4: "UUIDv4",
		uuidv6: "UUIDv6",
		nanoid: "nanoid",
		guid: "GUID",
		cuid: "cuid",
		cuid2: "cuid2",
		ulid: "ULID",
		xid: "XID",
		ksuid: "KSUID",
		datetime: "ISO datetime",
		date: "ISO date",
		time: "ISO time",
		duration: "ISO duration",
		ipv4: "IPv4 address",
		ipv6: "IPv6 address",
		mac: "MAC address",
		cidrv4: "IPv4 range",
		cidrv6: "IPv6 range",
		base64: "base64-encoded string",
		base64url: "base64url-encoded string",
		json_string: "JSON string",
		e164: "E.164 number",
		currency_code: "currency code",
		credit_card: "credit card number",
		iban: "IBAN",
		jwt: "JWT",
		template_literal: "input"
	}, r = { nan: "NaN" };
	function i(e, t) {
		return e === "number" && typeof t == "number" && !Number.isFinite(t) ? String(t) : r[e] ?? e;
	}
	return (e) => {
		switch (e.code) {
			case "invalid_type": return `Invalid input: expected ${i(e.expected)}, received ${i(Qe(e.input), e.input)}`;
			case "invalid_value": return e.values.length === 1 ? `Invalid input: expected ${je(e.values[0])}` : `Invalid option: expected one of ${le(e.values, "|")}`;
			case "too_big": {
				let n = e.exact ? "exactly " : e.inclusive ? "<=" : "<", r = t(e.origin);
				return r ? `Too big: expected ${e.origin ?? "value"} to have ${n}${e.maximum.toString()} ${r.unit ?? "elements"}` : `Too big: expected ${e.origin ?? "value"} to be ${n}${e.maximum.toString()}`;
			}
			case "too_small": {
				let n = e.exact ? "exactly " : e.inclusive ? ">=" : ">", r = t(e.origin);
				return r ? `Too small: expected ${e.origin} to have ${n}${e.minimum.toString()} ${r.unit}` : `Too small: expected ${e.origin} to be ${n}${e.minimum.toString()}`;
			}
			case "invalid_format": {
				let t = e;
				return t.format === "starts_with" ? `Invalid string: must start with "${t.prefix}"` : t.format === "ends_with" ? `Invalid string: must end with "${t.suffix}"` : t.format === "includes" ? `Invalid string: must include "${t.includes}"` : t.format === "regex" ? `Invalid string: must match pattern ${t.pattern}` : `Invalid ${n[t.format] ?? e.format}`;
			}
			case "not_multiple_of": return `Invalid number: must be a multiple of ${e.divisor}`;
			case "unrecognized_keys": return `Unrecognized key${e.keys.length > 1 ? "s" : ""}: ${le(e.keys, ", ")}`;
			case "invalid_key": return `Invalid key in ${e.origin}`;
			case "invalid_union": return e.options && Array.isArray(e.options) && e.options.length > 0 ? `Invalid discriminator value. Expected ${e.options.map((e) => `'${e}'`).join(" | ")}` : e.inclusive === !1 ? "Invalid input: more than one option matched" : "Invalid input";
			case "invalid_element": return `Invalid value in ${e.origin}`;
			default: return "Invalid input";
		}
	};
};
function zi() {
	return { localeError: Ri() };
}
//#endregion
//#region web/node_modules/zod/v4/core/registries.js
var Bi, Vi = class {
	constructor() {
		this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
	}
	add(e, ...t) {
		let n = t[0];
		return this._map.set(e, n), n && typeof n == "object" && "id" in n && this._idmap.set(n.id, e), this;
	}
	clear() {
		return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
	}
	remove(e) {
		let t = this._map.get(e);
		return t && typeof t == "object" && "id" in t && this._idmap.delete(t.id), this._map.delete(e), this;
	}
	get(e) {
		let t = e._zod.parent;
		if (t) {
			let n = { ...this.get(t) ?? {} };
			delete n.id;
			let r = {
				...n,
				...this._map.get(e)
			};
			return Object.keys(r).length ? r : void 0;
		}
		return this._map.get(e);
	}
	has(e) {
		return this._map.has(e);
	}
};
function Hi() {
	return new Vi();
}
(Bi = globalThis).__zod_globalRegistry ?? (Bi.__zod_globalRegistry = Hi());
var Ui = globalThis.__zod_globalRegistry;
//#endregion
//#region web/node_modules/zod/v4/core/api.js
function Wi(e) {
	return e.checks &&= [...e.checks], e;
}
// @__NO_SIDE_EFFECTS__
function Gi(e, t) {
	return new e(Wi({
		type: "string",
		...E(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function Ki(e, t) {
	return new e({
		type: "string",
		format: "email",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function qi(e, t) {
	return new e({
		type: "string",
		format: "guid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ji(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Yi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v4",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Xi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v6",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Zi(e, t) {
	return new e({
		type: "string",
		format: "uuid",
		check: "string_format",
		abort: !1,
		version: "v7",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Qi(e, t) {
	return new e({
		type: "string",
		format: "url",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function $i(e, t) {
	return new e({
		type: "string",
		format: "emoji",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ea(e, t) {
	return new e({
		type: "string",
		format: "nanoid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ta(e, t) {
	return new e({
		type: "string",
		format: "cuid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function na(e, t) {
	return new e({
		type: "string",
		format: "cuid2",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ra(e, t) {
	return new e({
		type: "string",
		format: "ulid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ia(e, t) {
	return new e({
		type: "string",
		format: "xid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function aa(e, t) {
	return new e({
		type: "string",
		format: "ksuid",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function oa(e, t) {
	return new e({
		type: "string",
		format: "ipv4",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function sa(e, t) {
	return new e({
		type: "string",
		format: "ipv6",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ca(e, t) {
	return new e({
		type: "string",
		format: "cidrv4",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function la(e, t) {
	return new e({
		type: "string",
		format: "cidrv6",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ua(e, t) {
	return new e({
		type: "string",
		format: "base64",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function da(e, t) {
	return new e({
		type: "string",
		format: "base64url",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function fa(e, t) {
	return new e({
		type: "string",
		format: "e164",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function pa(e, t) {
	return new e({
		type: "string",
		format: "jwt",
		check: "string_format",
		abort: !1,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ma(e, t) {
	return new e({
		type: "string",
		format: "datetime",
		check: "string_format",
		offset: !1,
		local: !1,
		precision: null,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ha(e, t) {
	return new e({
		type: "string",
		format: "date",
		check: "string_format",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ga(e, t) {
	return new e({
		type: "string",
		format: "time",
		check: "string_format",
		precision: null,
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function _a(e, t) {
	return new e({
		type: "string",
		format: "duration",
		check: "string_format",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function va(e, t) {
	return new e(Wi({
		type: "number",
		checks: [],
		...E(t)
	}));
}
// @__NO_SIDE_EFFECTS__
function ya(e, t) {
	return new e({
		type: "number",
		check: "number_format",
		abort: !1,
		format: "safeint",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function ba(e, t) {
	return new e({
		type: "boolean",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function xa(e, t) {
	return new e({
		type: "null",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Sa(e) {
	return new e({ type: "any" });
}
// @__NO_SIDE_EFFECTS__
function Ca(e) {
	return new e({ type: "unknown" });
}
// @__NO_SIDE_EFFECTS__
function wa(e, t) {
	return new e({
		type: "never",
		...E(t)
	});
}
// @__NO_SIDE_EFFECTS__
function Ta(e, t) {
	return new kn({
		check: "less_than",
		...E(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function Ea(e, t) {
	return new kn({
		check: "less_than",
		...E(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function Da(e, t) {
	return new An({
		check: "greater_than",
		...E(t),
		value: e,
		inclusive: !1
	});
}
// @__NO_SIDE_EFFECTS__
function Oa(e, t) {
	return new An({
		check: "greater_than",
		...E(t),
		value: e,
		inclusive: !0
	});
}
// @__NO_SIDE_EFFECTS__
function ka(e, t) {
	return new jn({
		check: "multiple_of",
		...E(t),
		value: e
	});
}
// @__NO_SIDE_EFFECTS__
function Aa(e, t) {
	return new Nn({
		check: "max_length",
		...E(t),
		maximum: e
	});
}
// @__NO_SIDE_EFFECTS__
function ja(e, t) {
	return new Pn({
		check: "min_length",
		...E(t),
		minimum: e
	});
}
// @__NO_SIDE_EFFECTS__
function Ma(e, t) {
	return new Fn({
		check: "length_equals",
		...E(t),
		length: e
	});
}
// @__NO_SIDE_EFFECTS__
function Na(e, t) {
	return new Ln({
		check: "string_format",
		format: "regex",
		...E(t),
		pattern: e
	});
}
// @__NO_SIDE_EFFECTS__
function Pa(e) {
	return new Rn({
		check: "string_format",
		format: "lowercase",
		...E(e)
	});
}
// @__NO_SIDE_EFFECTS__
function Fa(e) {
	return new zn({
		check: "string_format",
		format: "uppercase",
		...E(e)
	});
}
// @__NO_SIDE_EFFECTS__
function Ia(e, t) {
	return new Bn({
		check: "string_format",
		format: "includes",
		...E(t),
		includes: e
	});
}
// @__NO_SIDE_EFFECTS__
function La(e, t) {
	return new Vn({
		check: "string_format",
		format: "starts_with",
		...E(t),
		prefix: e
	});
}
// @__NO_SIDE_EFFECTS__
function Ra(e, t) {
	return new Hn({
		check: "string_format",
		format: "ends_with",
		...E(t),
		suffix: e
	});
}
// @__NO_SIDE_EFFECTS__
function za(e) {
	return new Un({
		check: "overwrite",
		tx: e
	});
}
// @__NO_SIDE_EFFECTS__
function Ba(e) {
	return /* @__PURE__ */ za((t) => t.normalize(e));
}
// @__NO_SIDE_EFFECTS__
function Va() {
	return /* @__PURE__ */ za((e) => e.trim());
}
// @__NO_SIDE_EFFECTS__
function Ha() {
	return /* @__PURE__ */ za((e) => e.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function Ua() {
	return /* @__PURE__ */ za((e) => e.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function Wa() {
	return /* @__PURE__ */ za((e) => Se(e));
}
// @__NO_SIDE_EFFECTS__
function Ga(e, t, n) {
	return new e({
		type: "array",
		element: t,
		...E(n)
	});
}
// @__NO_SIDE_EFFECTS__
function Ka(e, t, n) {
	let r = E(n);
	return r.abort ??= !0, new e({
		type: "custom",
		check: "custom",
		fn: t,
		...r
	});
}
// @__NO_SIDE_EFFECTS__
function qa(e, t, n) {
	return new e({
		type: "custom",
		check: "custom",
		fn: t,
		...E(n)
	});
}
// @__NO_SIDE_EFFECTS__
function Ja(e, t) {
	let n = /* @__PURE__ */ Ya((t) => (t.addIssue = (e) => {
		if (typeof e == "string") t.issues.push($e(e, t.value, n._zod.def));
		else {
			let r = e;
			r.fatal && (r.continue = !1), r.code ??= "custom", "input" in r || (r.input = t.value), r.inst ??= n, r.continue ??= !n._zod.def.abort, t.issues.push($e(r));
		}
	}, e(t.value, t)), t);
	return n;
}
// @__NO_SIDE_EFFECTS__
function Ya(e, t) {
	let n = new N({
		check: "custom",
		...E(t)
	});
	return n._zod.check = e, n;
}
//#endregion
//#region web/node_modules/zod/v4/core/to-json-schema.js
function Xa(e, ...t) {
	for (let n of t) for (let t of Reflect.ownKeys(n)) Object.prototype.propertyIsEnumerable.call(n, t) && C(e, t, n[t]);
	return e;
}
function Za(e) {
	let t = e?.target ?? "draft-2020-12";
	return t === "draft-4" && (t = "draft-04"), t === "draft-7" && (t = "draft-07"), {
		processors: e.processors ?? {},
		metadataRegistry: e?.metadata ?? Ui,
		target: t,
		unrepresentable: e?.unrepresentable ?? "throw",
		override: e?.override ?? (() => {}),
		io: e?.io ?? "output",
		counter: 0,
		seen: /* @__PURE__ */ new Map(),
		sharedDefsExtractedFor: void 0,
		sharedEmitDoneFor: void 0,
		cycles: e?.cycles ?? "ref",
		reused: e?.reused ?? "inline",
		intersections: [],
		deferred: [],
		external: e?.external ?? void 0
	};
}
function I(e, t, n, r, i) {
	let a = typeof t.unrepresentable == "function" ? t.unrepresentable({
		zodSchema: e,
		path: r.path,
		message: i
	}) : t.unrepresentable;
	if (a === "any") return !1;
	if (a === void 0 || a === "throw") throw Error(i);
	return Object.assign(n, a), !0;
}
function L(e, t, n = {
	path: [],
	schemaPath: []
}) {
	var r;
	let i = e._zod.def, a = t.seen.get(e);
	if (a) return a.count++, n.schemaPath.includes(e) && (a.cycle = n.path), a.schema;
	let o = {
		schema: {},
		count: 1,
		cycle: void 0,
		path: n.path
	};
	t.seen.set(e, o), t.sharedDefsExtractedFor = void 0, t.sharedEmitDoneFor = void 0;
	let s = e._zod.toJSONSchema?.();
	if (s) o.schema = s;
	else {
		let r = {
			...n,
			schemaPath: [...n.schemaPath, e],
			path: n.path
		};
		if (e._zod.processJSONSchema) e._zod.processJSONSchema(t, o.schema, r);
		else {
			let n = o.schema, a = t.processors[i.type];
			if (!a) throw Error(`[toJSONSchema]: Non-representable type encountered: ${i.type}`);
			a(e, t, n, r);
		}
		let a = e._zod.parent;
		a && (o.ref ||= a, L(a, t, r), t.seen.get(a).isParent = !0);
	}
	let c = t.metadataRegistry.get(e);
	return c && Xa(o.schema, c), t.io === "input" && R(e) && (delete o.schema.examples, delete o.schema.default), t.io === "input" && "_prefault" in o.schema && ((r = o.schema).default ?? (r.default = o.schema._prefault)), delete o.schema._prefault, t.seen.get(e).schema;
}
function Qa(e) {
	return e.replace(/~/g, "~0").replace(/\//g, "~1");
}
function $a(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	if (e.external && e.sharedDefsExtractedFor === e.external) return;
	let r = /* @__PURE__ */ new Map();
	for (let t of e.seen.entries()) {
		let n = e.metadataRegistry.get(t[0])?.id;
		if (n) {
			let e = r.get(n);
			if (e && e !== t[0]) throw Error(`Duplicate schema id "${n}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
			r.set(n, t[0]);
		}
	}
	let i = (t) => {
		let r = e.target === "draft-2020-12" ? "$defs" : "definitions";
		if (e.external) {
			let n = e.external.registry.get(t[0])?.id, i = e.external.uri ?? ((e) => e);
			if (n) return { ref: i(n) };
			let a = t[1].defId ?? t[1].schema.id ?? `schema${e.counter++}`;
			return t[1].defId = a, {
				defId: a,
				ref: `${i("__shared")}#/${r}/${Qa(a)}`
			};
		}
		let i = `#/${r}/`;
		if (t[1] === n && !t[1].schema.id) return { ref: "#" };
		let a = t[1].schema.id ?? `__schema${e.counter++}`;
		return {
			defId: a,
			ref: i + Qa(a)
		};
	}, a = (e) => {
		if (e[1].schema.$ref) return;
		let t = e[1], { ref: n, defId: r } = i(e);
		t.def = { ...t.schema }, r && (t.defId = r);
		let a = t.schema;
		for (let e in a) delete a[e];
		a.$ref = n;
	};
	if (e.cycles === "throw") for (let t of e.seen.entries()) {
		let e = t[1];
		if (e.cycle) throw Error(`Cycle detected: #/${e.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
	}
	for (let n of e.seen.entries()) {
		let r = n[1];
		if (t === n[0]) {
			a(n);
			continue;
		}
		if (e.external) {
			let r = e.external.registry.get(n[0])?.id;
			if (t !== n[0] && r) {
				a(n);
				continue;
			}
		}
		if (e.metadataRegistry.get(n[0])?.id) {
			a(n);
			continue;
		}
		if (r.cycle) {
			a(n);
			continue;
		}
		r.count > 1 && e.reused === "ref" && a(n);
	}
	e.external && (e.sharedDefsExtractedFor = e.external);
}
function eo(e) {
	let t = e.anyOf;
	if (!Array.isArray(t) || t.length === 0 || e.type !== void 0) return;
	let n = [];
	for (let e of t) {
		if (!e || typeof e != "object") return;
		eo(e);
		let t = Object.keys(e);
		if (t.length !== 1 || t[0] !== "type") return;
		let r = e.type;
		for (let e of Array.isArray(r) ? r : [r]) {
			if (typeof e != "string") return;
			n.includes(e) || n.push(e);
		}
	}
	delete e.anyOf, e.type = n.length === 1 ? n[0] : n;
}
var to = /* @__PURE__ */ new Set([
	"type",
	"properties",
	"required",
	"additionalProperties"
]), no = ["oneOf", "anyOf"];
function ro(e) {
	let t = e.additionalProperties;
	return t === void 0 || t === !1 || typeof t != "object" || !t ? null : Object.keys(t).length ? t : null;
}
function io(e) {
	let t = [];
	for (let n of e) {
		if (typeof n != "object" || n.type !== "object") return null;
		for (let e in n) if (!to.has(e)) return null;
		t.push(n);
	}
	let n = {}, r = /* @__PURE__ */ new Set();
	for (let e of t) {
		for (let r in e.properties) {
			if (Object.prototype.hasOwnProperty.call(n, r)) continue;
			let e = [];
			for (let n of t) {
				let t = n.properties?.[r] ?? ro(n);
				t != null && (e.some((e) => JSON.stringify(e) === JSON.stringify(t)) || e.push(t));
			}
			C(n, r, e.length === 1 ? e[0] : io(e) ?? { allOf: e });
		}
		for (let t of e.required ?? []) r.add(t);
	}
	let i = {
		type: "object",
		properties: n
	};
	if (r.size && (i.required = [...r]), t.every((e) => e.additionalProperties === !1)) i.additionalProperties = !1;
	else {
		let e = [];
		for (let n of t) {
			let t = ro(n);
			t && !e.some((e) => JSON.stringify(e) === JSON.stringify(t)) && e.push(t);
		}
		e.length === 1 ? i.additionalProperties = e[0] : e.length > 1 && (i.additionalProperties = { allOf: e });
	}
	return i;
}
function ao(e) {
	let t = e.allOf;
	if (!Array.isArray(t) || t.length < 2) return;
	for (let t of to) if (t in e) return;
	let n = t.filter((e) => no.some((t) => Array.isArray(e[t]))), r = null;
	if (!n.length) r = io(t);
	else {
		let e = n[0], i = no.find((t) => Array.isArray(e[t]));
		if (Object.keys(e).length !== 1) return;
		let a = t.filter((t) => t !== e), o = e[i].map((e) => io([...a, e]));
		if (o.some((e) => !e)) return;
		r = { [i]: o };
	}
	r && (delete e.allOf, Xa(e, r));
}
function oo(e, t) {
	let n = e.seen.get(t);
	if (!n) throw Error("Unprocessed schema. This is a bug in Zod.");
	let r = (t) => {
		let n = e.seen.get(t);
		if (n.ref === null) return;
		let i = n.def ?? n.schema, a = { ...i }, o = n.ref;
		if (n.ref = null, o) {
			r(o);
			let n = e.seen.get(o), s = n.schema;
			if (s.$ref && (e.target === "draft-07" || e.target === "draft-04" || e.target === "openapi-3.0") ? (i.allOf = i.allOf ?? [], i.allOf.push(s)) : Xa(i, s), Xa(i, a), t._zod.parent === o) for (let e in i) e !== "$ref" && e !== "allOf" && (e in a || delete i[e]);
			if (s.$ref && n.def) for (let e in i) e !== "$ref" && e !== "allOf" && e in n.def && JSON.stringify(i[e]) === JSON.stringify(n.def[e]) && delete i[e];
		}
		let s = t._zod.parent;
		if (s && s !== o) {
			r(s);
			let t = e.seen.get(s);
			if (t?.schema.$ref && (i.$ref = t.schema.$ref, t.def)) for (let e in i) e !== "$ref" && e !== "allOf" && e in t.def && JSON.stringify(i[e]) === JSON.stringify(t.def[e]) && delete i[e];
		}
		e.override({
			zodSchema: t,
			jsonSchema: i,
			path: n.path ?? []
		});
	};
	if (!e.external || e.sharedEmitDoneFor !== e.external) {
		for (let t of [...e.seen.entries()].reverse()) r(t[0]);
		if (e.target !== "openapi-3.0") for (let t of e.seen.entries()) eo(t[1].def ?? t[1].schema);
		for (let t of e.deferred) t();
		if (e.intersections.length) {
			let t = /* @__PURE__ */ new Map();
			for (let n of e.seen.values()) for (let e of [n.schema, n.def]) {
				let n = e?.allOf;
				if (!Array.isArray(n)) continue;
				let r = t.get(n);
				r ? r.push(e) : t.set(n, [e]);
			}
			for (let n of e.intersections) for (let e of t.get(n) ?? []) ao(e);
		}
	}
	let i = {};
	if (e.target === "draft-2020-12" ? i.$schema = "https://json-schema.org/draft/2020-12/schema" : e.target === "draft-07" ? i.$schema = "http://json-schema.org/draft-07/schema#" : e.target === "draft-04" ? i.$schema = "http://json-schema.org/draft-04/schema#" : e.target, e.external?.uri) {
		let n = e.external.registry.get(t)?.id;
		if (!n) throw Error("Schema is missing an `id` property");
		i.$id = e.external.uri(n);
	}
	Xa(i, n.defId ? n.schema : n.def ?? n.schema);
	let a = e.metadataRegistry.get(t)?.id;
	a !== void 0 && i.id === a && delete i.id;
	let o = e.external?.defs ?? {};
	if (!e.external || e.sharedEmitDoneFor !== e.external) for (let t of e.seen.entries()) {
		let e = t[1];
		e.def && e.defId && (e.def.id === e.defId && delete e.def.id, C(o, e.defId, e.def));
	}
	e.external && (e.sharedEmitDoneFor = e.external), e.external || Object.keys(o).length > 0 && (e.target === "draft-2020-12" ? i.$defs = o : i.definitions = o);
	try {
		let n = JSON.parse(JSON.stringify(i));
		return Object.defineProperty(n, "~standard", {
			value: {
				...t["~standard"],
				jsonSchema: {
					input: co(t, "input", e.processors),
					output: co(t, "output", e.processors)
				}
			},
			enumerable: !1,
			writable: !1
		}), n;
	} catch {
		throw Error("Error converting schema to JSON.");
	}
}
function R(e, t) {
	let n = t ?? { seen: /* @__PURE__ */ new Set() };
	if (n.seen.has(e)) return !1;
	n.seen.add(e);
	let r = e._zod.def;
	if (r.type === "transform") return !0;
	if (r.type === "array") return R(r.element, n);
	if (r.type === "set") return R(r.valueType, n);
	if (r.type === "lazy") return R(r.getter(), n);
	if (r.type === "promise" || r.type === "optional" || r.type === "nonoptional" || r.type === "nullable" || r.type === "readonly" || r.type === "default" || r.type === "prefault" || r.type === "catch") return R(r.innerType, n);
	if (r.type === "intersection") return R(r.left, n) || R(r.right, n);
	if (r.type === "record" || r.type === "map") return R(r.keyType, n) || R(r.valueType, n);
	if (r.type === "pipe") return e._zod.traits.has("$ZodCodec") ? !0 : R(r.in, n) || R(r.out, n);
	if (r.type === "object") {
		for (let e in r.shape) if (R(r.shape[e], n)) return !0;
		return !1;
	}
	if (r.type === "union") {
		for (let e of r.options) if (R(e, n)) return !0;
		return !1;
	}
	if (r.type === "tuple") {
		for (let e of r.items) if (R(e, n)) return !0;
		return !!(r.rest && R(r.rest, n));
	}
	return !1;
}
var so = (e, t = {}) => (n) => {
	let r = Za({
		...n,
		processors: t
	});
	return L(e, r), $a(r, e), oo(r, e);
}, co = (e, t, n = {}) => (r) => {
	let { libraryOptions: i, target: a } = r ?? {}, o = Za({
		...i ?? {},
		target: a,
		io: t,
		processors: n
	});
	return L(e, o), $a(o, e), oo(o, e);
}, lo = (e, t, n) => {
	(e[t] === void 0 || n > e[t]) && (e[t] = n);
}, uo = (e, t, n) => {
	(e[t] === void 0 || n < e[t]) && (e[t] = n);
}, fo = (e, t) => {
	lo(e, "minimum", t), uo(e, "maximum", t);
}, po = (e, t) => {
	e.multipleOf ??= [], e.multipleOf.includes(t) || e.multipleOf.push(t);
}, mo = (e, t) => {
	e.patterns ??= /* @__PURE__ */ new Set(), e.patterns.add(t);
}, ho = (e, t) => {
	e.mime = e.mime ? e.mime.filter((e) => t.includes(e)) : [...t];
}, go = (e, t) => {
	e.format = t, t.includes("int") && (e.isInt = !0);
}, _o = (e, t) => lo(e, "minimum", t.minimum), vo = (e, t) => uo(e, "maximum", t.maximum), yo = (e) => (t, n) => {
	go(t, n.format);
	let [r, i] = e[n.format];
	lo(t, "minimum", r), uo(t, "maximum", i);
}, bo = {
	greater_than: (e, t) => lo(e, t.inclusive ? "minimum" : "exclusiveMinimum", t.value),
	less_than: (e, t) => uo(e, t.inclusive ? "maximum" : "exclusiveMaximum", t.value),
	multiple_of: (e, t) => po(e, t.value),
	number_format: yo(Ne),
	bigint_format: yo(Pe),
	min_length: _o,
	max_length: vo,
	length_equals: (e, t) => fo(e, t.length),
	min_size: _o,
	max_size: vo,
	size_equals: (e, t) => fo(e, t.size),
	string_format: (e, t) => {
		go(e, t.format), t.pattern && mo(e, t.pattern), (t.format === "base64" || t.format === "base64url") && (e.contentEncoding = t.format), (t.local || t.precision === -1) && (e.laxFormat = !0);
	},
	mime_type: (e, t) => ho(e, t.mime)
};
function z(e) {
	let t = {}, n = e._zod.def, r = e._zod.traits.has("$ZodCheck") ? [e, ...n.checks ?? []] : n.checks ?? [];
	for (let e of r) bo[e._zod.def.check]?.(t, e._zod.def);
	let i = e._zod.bag;
	i.minimum !== void 0 && lo(t, "minimum", i.minimum), i.exclusiveMinimum !== void 0 && lo(t, "exclusiveMinimum", i.exclusiveMinimum), i.maximum !== void 0 && uo(t, "maximum", i.maximum), i.exclusiveMaximum !== void 0 && uo(t, "exclusiveMaximum", i.exclusiveMaximum), i.multipleOf !== void 0 && po(t, i.multipleOf), i.format !== void 0 && (t.format ??= i.format, i.format.includes("int") && (t.isInt = !0)), i.mime && ho(t, i.mime);
	for (let e of i.patterns ?? []) mo(t, e);
	return t;
}
var xo = {
	guid: "uuid",
	url: "uri",
	datetime: "date-time",
	json_string: "json-string",
	regex: ""
}, So = /* @__PURE__ */ new Map([[Er, un], [Or, dn]]), Co = (e) => So.get(e) ?? e, wo = (e, t, n, r) => {
	let i = n;
	i.type = "string";
	let { minimum: a, maximum: o, format: s, patterns: c, contentEncoding: l, laxFormat: u } = z(e);
	if (typeof a == "number" && (i.minLength = a), typeof o == "number" && (i.maxLength = o), s && (i.format = xo[s] ?? s, i.format === "" && delete i.format, (s === "time" || u) && delete i.format), l && (i.contentEncoding = l), c && c.size > 0) {
		let e = [...c].map(Co);
		e.length === 1 ? i.pattern = e[0].source : e.length > 1 && (i.allOf = [...e.map((e) => ({
			...t.target === "draft-07" || t.target === "draft-04" || t.target === "openapi-3.0" ? { type: "string" } : {},
			pattern: e.source
		}))]);
	}
}, To = (e, t, n, r) => {
	let i = n, { minimum: a, maximum: o, multipleOf: s, exclusiveMaximum: c, exclusiveMinimum: l, isInt: u } = z(e);
	i.type = u ? "integer" : "number";
	let d = typeof l == "number" && l >= (a ?? -Infinity), f = typeof c == "number" && c <= (o ?? Infinity), p = t.target === "draft-04" || t.target === "openapi-3.0";
	if (d ? p ? (i.minimum = l, i.exclusiveMinimum = !0) : i.exclusiveMinimum = l : typeof a == "number" && (i.minimum = a), f ? p ? (i.maximum = c, i.exclusiveMaximum = !0) : i.exclusiveMaximum = c : typeof o == "number" && (i.maximum = o), s) {
		let n = /* @__PURE__ */ new Set();
		for (let a of s) Number.isFinite(a) && a !== 0 ? n.add(Math.abs(a)) : I(e, t, i, r, `A multipleOf divisor of ${a} cannot be represented in JSON Schema`);
		let [a, ...o] = n;
		a !== void 0 && (i.multipleOf = a), o.length && (i.allOf = [...i.allOf ?? [], ...o.map((e) => ({ multipleOf: e }))]);
	}
}, Eo = (e, t, n, r) => {
	n.type = "boolean";
}, Do = (e, t, n, r) => {
	t.target === "openapi-3.0" ? (n.type = "string", n.nullable = !0, n.enum = [null]) : n.type = "null";
}, Oo = (e, t, n, r) => {
	n.not = {};
}, ko = (e, t, n, r) => {
	let i = e._zod.def, a = ce(i.entries);
	if (a.length === 0) {
		n.not = {};
		return;
	}
	a.every((e) => typeof e == "number") && (n.type = "number"), a.every((e) => typeof e == "string") && (n.type = "string"), n.enum = a;
}, Ao = (e, t, n, r) => {
	let i = e._zod.def;
	if (i.values.length === 0) {
		n.not = {};
		return;
	}
	let a = [];
	for (let o of i.values) if (o === void 0) {
		if (I(e, t, n, r, "Literal `undefined` cannot be represented in JSON Schema")) return;
	} else if (typeof o == "bigint") {
		if (I(e, t, n, r, "BigInt literals cannot be represented in JSON Schema")) return;
		a.push(Number(o));
	} else a.push(o);
	if (a.length !== 0) {
		if (a.length === 1) {
			let e = a[0];
			n.type = e === null ? "null" : typeof e, t.target === "draft-04" || t.target === "openapi-3.0" ? n.enum = [e] : n.const = e;
		} else a.every((e) => typeof e == "number") && (n.type = "number"), a.every((e) => typeof e == "string") && (n.type = "string"), a.every((e) => typeof e == "boolean") && (n.type = "boolean"), a.every((e) => e === null) && (n.type = "null"), n.enum = a;
	}
}, jo = (e, t, n, r) => {
	I(e, t, n, r, "Custom types cannot be represented in JSON Schema");
}, Mo = (e, t, n, r) => {
	I(e, t, n, r, "Transforms cannot be represented in JSON Schema");
}, No = (e, t, n, r) => {
	let i = n, a = e._zod.def, { minimum: o, maximum: s } = z(e);
	typeof o == "number" && (i.minItems = o), typeof s == "number" && (i.maxItems = s), i.type = "array", i.items = L(a.element, t, {
		...r,
		path: [...r.path, "items"]
	});
};
function Po(e) {
	let t = e._zod.def;
	return t.type === "pipe" && t.in._zod.traits.has("$ZodTransform") ? Po(t.out) : t.type === "catch" ? Po(t.innerType) : e._zod.optin;
}
var Fo = (e, t, n, r) => {
	let i = n, a = e._zod.def, o = a.shape;
	if (Object.getOwnPropertySymbols(o).length && I(e, t, i, r, "Symbol keys cannot be represented in JSON Schema")) return;
	i.type = "object", i.properties = {};
	for (let e in o) C(i.properties, e, L(o[e], t, {
		...r,
		path: [
			...r.path,
			"properties",
			e
		]
	}));
	let s = [];
	for (let e of Object.keys(o)) {
		let n = a.shape[e];
		(t.io === "input" ? Po(n) === void 0 : n._zod.optout === void 0) && s.push(e);
	}
	s.length > 0 && (i.required = s), a.catchall?._zod.def.type === "never" ? i.additionalProperties = !1 : a.catchall ? a.catchall && (i.additionalProperties = L(a.catchall, t, {
		...r,
		path: [...r.path, "additionalProperties"]
	})) : t.io === "output" && (i.additionalProperties = !1);
}, Io = (e, t, n, r) => {
	let i = e._zod.def, a = i.inclusive === !1, o = i.options.map((e, n) => L(e, t, {
		...r,
		path: [
			...r.path,
			a ? "oneOf" : "anyOf",
			n
		]
	}));
	a ? n.oneOf = o : n.anyOf = o;
}, Lo = (e, t, n, r) => {
	let i = e._zod.def, a = L(i.left, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			0
		]
	}), o = L(i.right, t, {
		...r,
		path: [
			...r.path,
			"allOf",
			1
		]
	}), s = (e) => "allOf" in e && Object.keys(e).length === 1, c = [...s(a) ? a.allOf : [a], ...s(o) ? o.allOf : [o]];
	n.allOf = c, t.intersections.push(c);
};
function Ro(e, t, n) {
	if (t.$ref) {
		if (n.has(t)) return t;
		n.add(t);
		let r = e.get(t)?.def;
		if (!r) return t;
		let i = Ro(e, r, n);
		return i === r ? t : i;
	}
	for (let r of ["anyOf", "oneOf"]) {
		let i = t[r];
		if (!Array.isArray(i)) continue;
		let a = i.map((t) => Ro(e, t, n));
		a.some((e, t) => e !== i[t]) && (t = {
			...t,
			[r]: a
		});
	}
	let r = Array.isArray(t.type) ? t.type : [t.type], i = !r.includes("string") && r.some((e) => e === "number" || e === "integer"), a = t.enum ?? (t.const === void 0 ? void 0 : [t.const]);
	if (!i && !a?.some((e) => typeof e == "number")) return t;
	let { minimum: o, maximum: s, exclusiveMinimum: c, exclusiveMaximum: l, multipleOf: u, format: d, id: f, ...p } = t;
	return p.enum ? p.enum = p.enum.map((e) => typeof e == "number" ? String(e) : e) : typeof p.const == "number" && (p.const = String(p.const)), i ? (p.type = "string", a || (p.pattern = (r.includes("number") ? Sn : xn).source), p) : p;
}
var zo = /* @__PURE__ */ new WeakMap();
function Bo(e) {
	let t = /* @__PURE__ */ new Map();
	for (let n of e.seen.values()) n.def && !t.has(n.schema) && t.set(n.schema, n);
	let n = /* @__PURE__ */ new Map();
	for (let r of zo.get(e) ?? []) {
		let i = e.seen.get(r), a = (i?.def ?? i?.schema)?.propertyNames;
		if (!a || a === !0 || n.has(a)) continue;
		let o = Ro(t, a, /* @__PURE__ */ new Set());
		o !== a && n.set(a, o);
	}
	if (n.size) for (let t of e.seen.values()) for (let e of [t.schema, t.def]) {
		let t = e && n.get(e.propertyNames);
		t && (e.propertyNames = t);
	}
}
var Vo = (e, t, n, r) => {
	let i = n, a = e._zod.def;
	i.type = "object";
	let o = a.keyType, s = z(o).patterns;
	if (a.mode === "loose" && s && s.size > 0) {
		let e = L(a.valueType, t, {
			...r,
			path: [
				...r.path,
				"patternProperties",
				"*"
			]
		});
		i.patternProperties = {};
		for (let t of s) C(i.patternProperties, Co(t).source, e);
	} else {
		if (t.target === "draft-07" || t.target === "draft-2020-12") {
			i.propertyNames = L(a.keyType, t, {
				...r,
				path: [...r.path, "propertyNames"]
			});
			let n = zo.get(t);
			n || (n = [], zo.set(t, n), t.deferred.push(() => Bo(t))), n.push(e);
		}
		i.additionalProperties = L(a.valueType, t, {
			...r,
			path: [...r.path, "additionalProperties"]
		});
	}
	let c = o._zod.values, l = t.io === "input" && Po(a.valueType) !== void 0;
	if (c && !a.partial && !l) {
		let e = [...c].filter((e) => typeof e == "string" || typeof e == "number");
		e.length > 0 && (i.required = e.map(String));
	}
}, Ho = (e, t, n, r) => {
	let i = e._zod.def, a = L(i.innerType, t, r), o = t.seen.get(e);
	t.target === "openapi-3.0" ? (o.ref = i.innerType, n.nullable = !0) : n.anyOf = [a, { type: "null" }];
}, Uo = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, Wo = Symbol();
function Go(e, t, n, r, i) {
	let a = !1, o = JSON.stringify(e, (e, t) => typeof t == "bigint" ? (a = !0, null) : t);
	return a ? (I(t, n, r, i, "BigInt defaults cannot be represented in JSON Schema"), Wo) : JSON.parse(o);
}
var Ko = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o = Go(i.defaultValue, e, t, n, r);
	o !== Wo && (n.default = o);
}, qo = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	if (a.ref = i.innerType, t.io !== "input") return;
	let o = Go(i.defaultValue, e, t, n, r);
	o !== Wo && (n._prefault = o);
}, Jo = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
	let o;
	try {
		o = i.catchValue(void 0);
	} catch {
		I(e, t, n, r, "Dynamic catch values are not supported in JSON Schema");
		return;
	}
	n.default = o;
}, Yo = (e, t, n, r) => {
	let i = e._zod.def, a = i.in._zod.traits.has("$ZodTransform"), o = t.io === "input" ? a ? i.out : i.in : i.out;
	L(o, t, r);
	let s = t.seen.get(e);
	s.ref = o;
}, Xo = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType, n.readOnly = !0;
}, Zo = (e, t, n, r) => {
	let i = e._zod.def;
	L(i.innerType, t, r);
	let a = t.seen.get(e);
	a.ref = i.innerType;
}, Qo = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
function $o(e, t, n) {
	Object.defineProperty(e, t, {
		configurable: !0,
		enumerable: !1,
		get() {
			let e = n(this);
			return Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			}), e;
		},
		set(e) {
			Object.defineProperty(this, t, {
				value: e,
				configurable: !0,
				writable: !0
			});
		}
	});
}
var B = /*@__PURE__*/ A("ZodError", (e, t) => {
	Ct.init(e, t), e.name = "ZodError";
	let n = Object.getPrototypeOf(e);
	Qo.has(n) || (Qo.add(n), $o(n, "format", (e) => (t) => Et(e, t)), $o(n, "flatten", (e) => (t) => Tt(e, t)), $o(n, "addIssue", (e) => (t) => {
		e.issues.push(t), e.message = JSON.stringify(e.issues, ue, 2);
	}), $o(n, "addIssues", (e) => (t) => {
		e.issues.push(...t), e.message = JSON.stringify(e.issues, ue, 2);
	}), Object.defineProperty(n, "isEmpty", {
		configurable: !0,
		enumerable: !1,
		get() {
			return this.issues.length === 0;
		}
	}));
}, void 0, { Parent: Error }), es = /* @__PURE__ */ Ot(B), ts = /* @__PURE__ */ kt(B), ns = /* @__PURE__ */ At(B), rs = /* @__PURE__ */ Mt(B), is = /* @__PURE__ */ Rt(B), as = /* @__PURE__ */ zt(B), os = /* @__PURE__ */ Bt(B), ss = /* @__PURE__ */ Vt(B), cs = /* @__PURE__ */ Ht(B), ls = /* @__PURE__ */ Ut(B), us = /* @__PURE__ */ Wt(B), ds = /* @__PURE__ */ Gt(B);
//#endregion
//#region web/node_modules/zod/v4/classic/schemas.js
function fs() {
	j.localeError || M(zi());
}
function ps() {
	j.memoizer || M({ memoizer: Ii() });
}
var V = /*@__PURE__*/ A("ZodType", (e, t) => (fs(), P.init(e, t), e.def = t, e.type = t.type, e), {
	check(...e) {
		let t = this.def;
		return this.clone(T(t, { checks: [...t.checks ?? [], ...e.map((e) => typeof e == "function" ? { _zod: {
			check: e,
			def: { check: "custom" },
			onattach: []
		} } : e)] }), { parent: !0 });
	},
	with(...e) {
		return this.check(...e);
	},
	clone(e, t) {
		return Ae(this, e, t);
	},
	brand() {
		return this;
	},
	register(e, t) {
		return e.add(this, t), this;
	},
	refine(e, t) {
		return this.check(Ac(e, t));
	},
	superRefine(e, t) {
		return this.check(jc(e, t));
	},
	overwrite(e) {
		return this.check(/* @__PURE__ */ za(e));
	},
	optional() {
		return dc(this);
	},
	exactOptional() {
		return pc(this);
	},
	nullable() {
		return hc(this);
	},
	nullish() {
		return dc(hc(this));
	},
	nonoptional(e) {
		return xc(this, e);
	},
	array() {
		return $s(this);
	},
	or(e) {
		return q([this, e]);
	},
	and(e) {
		return rc(this, e);
	},
	transform(e) {
		return Tc(this, lc(e));
	},
	default(e) {
		return _c(this, e);
	},
	prefault(e) {
		return yc(this, e);
	},
	catch(e) {
		return Cc(this, e);
	},
	pipe(e) {
		return Tc(this, e);
	},
	readonly() {
		return Dc(this);
	},
	describe(e) {
		let t = this.clone();
		return Ui.add(t, { description: e }), t;
	},
	meta(...e) {
		if (e.length === 0) return Ui.get(this);
		let t = this.clone();
		return Ui.add(t, e[0]), t;
	},
	isOptional() {
		return this.safeParse(void 0).success;
	},
	isNullable() {
		return this.safeParse(null).success;
	},
	apply(e, ...t) {
		return t.length === 0 ? e(this) : e(this, ...t);
	},
	get "~standard"() {
		return tt(this, "~standard", {
			...Jn(this),
			jsonSchema: {
				input: co(this, "input"),
				output: co(this, "output")
			}
		});
	},
	set "~standard"(e) {
		O(this, "~standard", e);
	},
	parse: function e(t, n) {
		return es(this, t, n, { callee: e });
	},
	parseAsync: async function e(t, n) {
		return await ts(this, t, n, { callee: e });
	},
	safeParse(e, t) {
		return ns(this, e, t);
	},
	async safeParseAsync(e, t) {
		return rs(this, e, t);
	},
	get spa() {
		return this?.safeParseAsync;
	},
	set spa(e) {
		O(this, "spa", e);
	},
	validate(e, t) {
		return Ft(this, e, t);
	},
	validateAsync(e, t) {
		return Lt(this, e, t);
	},
	encode: function e(t, n) {
		return is(this, t, n, { callee: e });
	},
	decode: function e(t, n) {
		return as(this, t, n, { callee: e });
	},
	encodeAsync: async function e(t, n) {
		return await os(this, t, n, { callee: e });
	},
	decodeAsync: async function e(t, n) {
		return await ss(this, t, n, { callee: e });
	},
	safeEncode(e, t) {
		return cs(this, e, t);
	},
	safeDecode(e, t) {
		return ls(this, e, t);
	},
	async safeEncodeAsync(e, t) {
		return us(this, e, t);
	},
	async safeDecodeAsync(e, t) {
		return ds(this, e, t);
	},
	toJSONSchema(e) {
		return so(this, {})(e);
	},
	get description() {
		return Ui.get(this)?.description;
	},
	get _def() {
		return this._zod.def;
	}
}), ms = /*@__PURE__*/ A("_ZodString", (e, t) => {
	Yn.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => wo(e, t, n, r);
}, /*@__PURE__*/ nt({
	format: (e) => z(e).format ?? null,
	minLength: (e) => z(e).minimum ?? null,
	maxLength: (e) => z(e).maximum ?? null
}, {
	regex(...e) {
		return this.check(/* @__PURE__ */ Na(...e));
	},
	includes(...e) {
		return this.check(/* @__PURE__ */ Ia(...e));
	},
	startsWith(...e) {
		return this.check(/* @__PURE__ */ La(...e));
	},
	endsWith(...e) {
		return this.check(/* @__PURE__ */ Ra(...e));
	},
	min(...e) {
		return this.check(/* @__PURE__ */ ja(...e));
	},
	max(...e) {
		return this.check(/* @__PURE__ */ Aa(...e));
	},
	length(...e) {
		return this.check(/* @__PURE__ */ Ma(...e));
	},
	nonempty(...e) {
		return this.check(/* @__PURE__ */ ja(1, ...e));
	},
	lowercase(e) {
		return this.check(/* @__PURE__ */ Pa(e));
	},
	uppercase(e) {
		return this.check(/* @__PURE__ */ Fa(e));
	},
	trim() {
		return this.check(/* @__PURE__ */ Va());
	},
	normalize(...e) {
		return this.check(/* @__PURE__ */ Ba(...e));
	},
	toLowerCase() {
		return this.check(/* @__PURE__ */ Ha());
	},
	toUpperCase() {
		return this.check(/* @__PURE__ */ Ua());
	},
	slugify() {
		return this.check(/* @__PURE__ */ Wa());
	}
})), hs = /*@__PURE__*/ A("ZodString", (e, t) => {
	Yn.init(e, t), ms.init(e, t);
}, {
	email(e) {
		return this.check(/* @__PURE__ */ Ki(bs, e));
	},
	url(e) {
		return this.check(/* @__PURE__ */ Qi(Cs, e));
	},
	jwt(e) {
		return this.check(/* @__PURE__ */ pa(zs, e));
	},
	emoji(e) {
		return this.check(/* @__PURE__ */ $i(Ts, e));
	},
	guid(e) {
		return this.check(/* @__PURE__ */ qi(xs, e));
	},
	uuid(e) {
		return this.check(/* @__PURE__ */ Ji(Ss, e));
	},
	uuidv4(e) {
		return this.check(/* @__PURE__ */ Yi(Ss, e));
	},
	uuidv6(e) {
		return this.check(/* @__PURE__ */ Xi(Ss, e));
	},
	uuidv7(e) {
		return this.check(/* @__PURE__ */ Zi(Ss, e));
	},
	nanoid(e) {
		return this.check(/* @__PURE__ */ ea(Es, e));
	},
	cuid(e) {
		return this.check(/* @__PURE__ */ ta(Ds, e));
	},
	cuid2(e) {
		return this.check(/* @__PURE__ */ na(Os, e));
	},
	ulid(e) {
		return this.check(/* @__PURE__ */ ra(ks, e));
	},
	base64(e) {
		return this.check(/* @__PURE__ */ ua(Is, e));
	},
	base64url(e) {
		return this.check(/* @__PURE__ */ da(Ls, e));
	},
	xid(e) {
		return this.check(/* @__PURE__ */ ia(As, e));
	},
	ksuid(e) {
		return this.check(/* @__PURE__ */ aa(js, e));
	},
	ipv4(e) {
		return this.check(/* @__PURE__ */ oa(Ms, e));
	},
	ipv6(e) {
		return this.check(/* @__PURE__ */ sa(Ns, e));
	},
	cidrv4(e) {
		return this.check(/* @__PURE__ */ ca(Ps, e));
	},
	cidrv6(e) {
		return this.check(/* @__PURE__ */ la(Fs, e));
	},
	e164(e) {
		return this.check(/* @__PURE__ */ fa(Rs, e));
	},
	datetime(e) {
		return this.check(/* @__PURE__ */ ma(gs, e));
	},
	date(e) {
		return this.check(/* @__PURE__ */ ha(_s, e));
	},
	time(e) {
		return this.check(/* @__PURE__ */ ga(vs, e));
	},
	duration(e) {
		return this.check(/* @__PURE__ */ _a(ys, e));
	}
});
function H(e) {
	return /* @__PURE__ */ Gi(hs, e);
}
var U = /*@__PURE__*/ A("ZodStringFormat", (e, t) => {
	F.init(e, t), ms.init(e, t);
}), gs = /*@__PURE__*/ A("ZodISODateTime", (e, t) => {
	mr.init(e, t), U.init(e, t);
}), _s = /*@__PURE__*/ A("ZodISODate", (e, t) => {
	hr.init(e, t), U.init(e, t);
}), vs = /*@__PURE__*/ A("ZodISOTime", (e, t) => {
	gr.init(e, t), U.init(e, t);
}), ys = /*@__PURE__*/ A("ZodISODuration", (e, t) => {
	_r.init(e, t), U.init(e, t);
}), bs = /*@__PURE__*/ A("ZodEmail", (e, t) => {
	Qn.init(e, t), U.init(e, t);
}), xs = /*@__PURE__*/ A("ZodGUID", (e, t) => {
	Xn.init(e, t), U.init(e, t);
}), Ss = /*@__PURE__*/ A("ZodUUID", (e, t) => {
	Zn.init(e, t), U.init(e, t);
}), Cs = /*@__PURE__*/ A("ZodURL", (e, t) => {
	or.init(e, t), U.init(e, t);
});
function ws(e) {
	return /* @__PURE__ */ Qi(Cs, e);
}
var Ts = /*@__PURE__*/ A("ZodEmoji", (e, t) => {
	sr.init(e, t), U.init(e, t);
}), Es = /*@__PURE__*/ A("ZodNanoID", (e, t) => {
	cr.init(e, t), U.init(e, t);
}), Ds = /*@__PURE__*/ A("ZodCUID", (e, t) => {
	lr.init(e, t), U.init(e, t);
}), Os = /*@__PURE__*/ A("ZodCUID2", (e, t) => {
	ur.init(e, t), U.init(e, t);
}), ks = /*@__PURE__*/ A("ZodULID", (e, t) => {
	dr.init(e, t), U.init(e, t);
}), As = /*@__PURE__*/ A("ZodXID", (e, t) => {
	fr.init(e, t), U.init(e, t);
}), js = /*@__PURE__*/ A("ZodKSUID", (e, t) => {
	pr.init(e, t), U.init(e, t);
}), Ms = /*@__PURE__*/ A("ZodIPv4", (e, t) => {
	vr.init(e, t), U.init(e, t);
}), Ns = /*@__PURE__*/ A("ZodIPv6", (e, t) => {
	xr.init(e, t), U.init(e, t);
}), Ps = /*@__PURE__*/ A("ZodCIDRv4", (e, t) => {
	Sr.init(e, t), U.init(e, t);
}), Fs = /*@__PURE__*/ A("ZodCIDRv6", (e, t) => {
	wr.init(e, t), U.init(e, t);
}), Is = /*@__PURE__*/ A("ZodBase64", (e, t) => {
	Dr.init(e, t), U.init(e, t);
}), Ls = /*@__PURE__*/ A("ZodBase64URL", (e, t) => {
	Ar.init(e, t), U.init(e, t);
}), Rs = /*@__PURE__*/ A("ZodE164", (e, t) => {
	jr.init(e, t), U.init(e, t);
}), zs = /*@__PURE__*/ A("ZodJWT", (e, t) => {
	Nr.init(e, t), U.init(e, t);
}), Bs = /*@__PURE__*/ A("ZodNumber", (e, t) => {
	Pr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => To(e, t, n, r), e.isFinite = !0;
}, /*@__PURE__*/ nt({
	minValue: (e) => {
		let { minimum: t, exclusiveMinimum: n } = z(e);
		return Math.max(t ?? -Infinity, n ?? -Infinity);
	},
	maxValue: (e) => {
		let { maximum: t, exclusiveMaximum: n } = z(e);
		return Math.min(t ?? Infinity, n ?? Infinity);
	},
	isInt: (e) => {
		let { isInt: t, multipleOf: n } = z(e);
		return !!t || !!n?.some(Number.isSafeInteger);
	},
	format: (e) => z(e).format ?? null
}, {
	gt(e, t) {
		return this.check(/* @__PURE__ */ Da(e, t));
	},
	gte(e, t) {
		return this.check(/* @__PURE__ */ Oa(e, t));
	},
	min(e, t) {
		return this.check(/* @__PURE__ */ Oa(e, t));
	},
	lt(e, t) {
		return this.check(/* @__PURE__ */ Ta(e, t));
	},
	lte(e, t) {
		return this.check(/* @__PURE__ */ Ea(e, t));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ Ea(e, t));
	},
	int(e) {
		return this.check(Hs(e));
	},
	safe(e) {
		return this.check(Hs(e));
	},
	positive(e) {
		return this.check(/* @__PURE__ */ Da(0, e));
	},
	nonnegative(e) {
		return this.check(/* @__PURE__ */ Oa(0, e));
	},
	negative(e) {
		return this.check(/* @__PURE__ */ Ta(0, e));
	},
	nonpositive(e) {
		return this.check(/* @__PURE__ */ Ea(0, e));
	},
	multipleOf(e, t) {
		return this.check(/* @__PURE__ */ ka(e, t));
	},
	step(e, t) {
		return this.check(/* @__PURE__ */ ka(e, t));
	},
	finite() {
		return this;
	}
}));
function W(e) {
	return /* @__PURE__ */ va(Bs, e);
}
var Vs = /*@__PURE__*/ A("ZodNumberFormat", (e, t) => {
	Fr.init(e, t), Bs.init(e, t);
});
function Hs(e) {
	return /* @__PURE__ */ ya(Vs, e);
}
var Us = /*@__PURE__*/ A("ZodBoolean", (e, t) => {
	Ir.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Eo(e, t, n, r);
});
function G(e) {
	return /* @__PURE__ */ ba(Us, e);
}
var Ws = /*@__PURE__*/ A("ZodNull", (e, t) => {
	Lr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Do(e, t, n, r);
});
function Gs(e) {
	return /* @__PURE__ */ xa(Ws, e);
}
var Ks = /*@__PURE__*/ A("ZodAny", (e, t) => {
	Rr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (e, t, n) => void 0;
});
function qs() {
	return /* @__PURE__ */ Sa(Ks);
}
var Js = /*@__PURE__*/ A("ZodUnknown", (e, t) => {
	zr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (e, t, n) => void 0;
});
function Ys() {
	return /* @__PURE__ */ Ca(Js);
}
var Xs = /*@__PURE__*/ A("ZodNever", (e, t) => {
	Br.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Oo(e, t, n, r);
});
function Zs(e) {
	return /* @__PURE__ */ wa(Xs, e);
}
var Qs = /*@__PURE__*/ A("ZodArray", (e, t) => {
	ps(), Hr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => No(e, t, n, r), e.element = t.element;
}, {
	min(e, t) {
		return this.check(/* @__PURE__ */ ja(e, t));
	},
	nonempty(e) {
		return this.check(/* @__PURE__ */ ja(1, e));
	},
	max(e, t) {
		return this.check(/* @__PURE__ */ Aa(e, t));
	},
	length(e, t) {
		return this.check(/* @__PURE__ */ Ma(e, t));
	},
	unwrap() {
		return this.element;
	}
});
function $s(e, t) {
	return /* @__PURE__ */ Ga(Qs, e, t);
}
var ec = /*@__PURE__*/ A("ZodObject", (e, t) => {
	ps(), Jr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Fo(e, t, n, r), ct(e, "shape", (e) => e._zod.def.shape, !1);
}, {
	keyof() {
		return J(Object.keys(this._zod.def.shape));
	},
	catchall(e) {
		return this.clone(T(this._zod.def, { catchall: e }));
	},
	passthrough() {
		return this.clone(T(this._zod.def, { catchall: Ys() }));
	},
	loose() {
		return this.clone(T(this._zod.def, { catchall: Ys() }));
	},
	strict() {
		return this.clone(T(this._zod.def, { catchall: Zs() }));
	},
	strip() {
		return this.clone(T(this._zod.def, { catchall: void 0 }));
	},
	extend(e) {
		return Re(this, e);
	},
	safeExtend(e) {
		return Be(this, e);
	},
	merge(e) {
		return Ve(this, e);
	},
	pick(e) {
		return Fe(this, e);
	},
	omit(e) {
		return Le(this, e);
	},
	partial(...e) {
		return He(uc, this, e[0]);
	},
	exactPartial(...e) {
		return He(fc, this, e[0], "exactPartial");
	},
	required(...e) {
		return Ue(bc, this, e[0]);
	}
});
function K(e, t) {
	return new ec({
		type: "object",
		shape: e ?? {},
		...E(t)
	});
}
var tc = /*@__PURE__*/ A("ZodUnion", (e, t) => {
	Xr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Io(e, t, n, r), e.options = t.options;
});
function q(e, t) {
	return new tc({
		type: "union",
		options: e,
		...E(t)
	});
}
var nc = /*@__PURE__*/ A("ZodIntersection", (e, t) => {
	Zr.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Lo(e, t, n, r);
});
function rc(e, t) {
	return new nc({
		type: "intersection",
		left: e,
		right: t
	});
}
var ic = /*@__PURE__*/ A("ZodRecord", (e, t) => {
	ps(), ei.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Vo(e, t, n, r), e.keyType = t.keyType, e.valueType = t.valueType;
});
function ac(e, t, n) {
	return !t || !t._zod ? new ic({
		type: "record",
		keyType: H(),
		valueType: e,
		...E(t)
	}) : new ic({
		type: "record",
		keyType: e,
		valueType: t,
		...E(n)
	});
}
var oc = /*@__PURE__*/ A("ZodEnum", (e, t) => {
	ti.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => ko(e, t, n, r), e.enum = t.entries, e.options = [...e._zod.values];
	let n = new Set(Object.keys(t.entries));
	e.extract = (e, r) => {
		let i = {};
		for (let r of e) if (n.has(r)) i[r] = t.entries[r];
		else throw Error(`Key ${r} not found in enum`);
		return new oc({
			...t,
			checks: [],
			...E(r),
			entries: i
		});
	}, e.exclude = (e, r) => {
		let i = { ...t.entries };
		for (let t of e) if (n.has(t)) delete i[t];
		else throw Error(`Key ${t} not found in enum`);
		return new oc({
			...t,
			checks: [],
			...E(r),
			entries: i
		});
	};
});
function J(e, t) {
	return new oc({
		type: "enum",
		entries: Array.isArray(e) ? Object.fromEntries(e.map((e) => [e, e])) : e,
		...E(t)
	});
}
var sc = /*@__PURE__*/ A("ZodLiteral", (e, t) => {
	ni.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ao(e, t, n, r), e.values = new Set(t.values), Object.defineProperty(e, "value", { get() {
		if (t.values.length > 1) throw Error("This schema contains multiple valid literal values. Use `.values` instead.");
		return t.values[0];
	} });
});
function Y(e, t) {
	return new sc({
		type: "literal",
		values: Array.isArray(e) ? e : [e],
		...E(t)
	});
}
var cc = /*@__PURE__*/ A("ZodTransform", (e, t) => {
	ps(), ri.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Mo(e, t, n, r), e._zod.parse = (n, r) => {
		if (r.direction === "backward") throw new gt(e.constructor.name);
		n.addIssue = (r) => {
			if (typeof r == "string") n.issues.push($e(r, n.value, t));
			else {
				let t = r;
				t.fatal && (t.continue = !1), t.code ??= "custom", "input" in t || (t.input = n.value), t.inst ??= e, n.issues.push($e(t));
			}
		};
		let i = t.transform(n.value, n);
		return i instanceof Promise ? i.then((e) => (n.value = e, n)) : (n.value = i, n);
	};
});
function lc(e) {
	return new cc({
		type: "transform",
		transform: e
	});
}
var uc = /*@__PURE__*/ A("ZodOptional", (e, t) => {
	ai.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Zo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function dc(e) {
	return new uc({
		type: "optional",
		innerType: e
	});
}
var fc = /*@__PURE__*/ A("ZodExactOptional", (e, t) => {
	oi.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Zo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function pc(e) {
	return new fc({
		type: "optional",
		innerType: e
	});
}
var mc = /*@__PURE__*/ A("ZodNullable", (e, t) => {
	si.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ho(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function hc(e) {
	return new mc({
		type: "nullable",
		innerType: e
	});
}
var gc = /*@__PURE__*/ A("ZodDefault", (e, t) => {
	ci.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Ko(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeDefault = e.unwrap;
});
function _c(e, t) {
	return new gc({
		type: "default",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : De(t);
		}
	});
}
var vc = /*@__PURE__*/ A("ZodPrefault", (e, t) => {
	ui.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => qo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function yc(e, t) {
	return new vc({
		type: "prefault",
		innerType: e,
		get defaultValue() {
			return typeof t == "function" ? t() : De(t);
		}
	});
}
var bc = /*@__PURE__*/ A("ZodNonOptional", (e, t) => {
	di.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Uo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function xc(e, t) {
	return new bc({
		type: "nonoptional",
		innerType: e,
		...E(t)
	});
}
var Sc = /*@__PURE__*/ A("ZodCatch", (e, t) => {
	mi.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Jo(e, t, n, r), e.unwrap = () => e._zod.def.innerType, e.removeCatch = e.unwrap;
});
function Cc(e, t) {
	return new Sc({
		type: "catch",
		innerType: e,
		catchValue: typeof t == "function" ? t : ut(t)
	});
}
var wc = /*@__PURE__*/ A("ZodPipe", (e, t) => {
	hi.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Yo(e, t, n, r), e.in = t.in, e.out = t.out;
});
function Tc(e, t) {
	return new wc({
		type: "pipe",
		in: e,
		out: t
	});
}
var Ec = /*@__PURE__*/ A("ZodReadonly", (e, t) => {
	_i.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => Xo(e, t, n, r), e.unwrap = () => e._zod.def.innerType;
});
function Dc(e) {
	return new Ec({
		type: "readonly",
		innerType: e
	});
}
var Oc = /*@__PURE__*/ A("ZodCustom", (e, t) => {
	yi.init(e, t), V.init(e, t), e._zod.processJSONSchema = (t, n, r) => jo(e, t, n, r);
});
function kc(e, t) {
	return /* @__PURE__ */ Ka(Oc, e ?? (() => !0), t);
}
function Ac(e, t = {}) {
	return /* @__PURE__ */ qa(Oc, e, t);
}
function jc(e, t) {
	return /* @__PURE__ */ Ja(e, t);
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/utils/runtime.js
function Mc(e, t) {
	let n = globalThis[t];
	return typeof n == "function" && e instanceof n;
}
function Nc(e) {
	return kc((t) => Mc(t, e), { message: `Expected ${e}` });
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/version.js
var Pc = "0.2.3";
//#endregion
//#region web/node_modules/@decartai/sdk/dist/utils/user-agent.js
function Fc(e = globalThis) {
	return e.window ? "runtime/browser" : e.navigator?.userAgent ? `runtime/${e.navigator.userAgent.toLowerCase()}` : e.process?.versions?.node ? `runtime/node.js/${e.process.version.substring(0)}` : e.EdgeRuntime ? "runtime/vercel-edge" : "runtime/unknown";
}
function Ic(e, t = globalThis) {
	return [
		`decart-js-sdk/${Pc}`,
		"lang/js",
		...e ? [e] : [],
		Fc(t)
	].join(" ");
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/shared/request.js
function Lc(e) {
	return typeof e == "object" && !!e && typeof e.uri == "string" && typeof e.type == "string" && typeof e.name == "string";
}
async function Rc(e) {
	if (Lc(e) || Mc(e, "Blob") || Mc(e, "File")) return e;
	if (Mc(e, "ReadableStream")) return new Response(e).blob();
	if (typeof e == "string" || Mc(e, "URL")) {
		let t = typeof e == "string" ? e : e.toString();
		if (!t.startsWith("http://") && !t.startsWith("https://")) throw p("URL must start with http:// or https://");
		let n = await fetch(t);
		if (!n.ok) throw p(`Failed to fetch file from URL: ${n.statusText}`);
		return n.blob();
	}
	throw p("Invalid file input type");
}
async function zc(e) {
	let t = await e.text().catch(() => "");
	if (!t) return "Unknown error";
	try {
		let e = JSON.parse(t).detail;
		if (typeof e == "string" && e) return e;
	} catch {}
	return t;
}
function X(e = {}) {
	let { apiKey: t, integration: n } = e;
	return {
		"User-Agent": Ic(n),
		...t ? { "X-API-KEY": t } : {}
	};
}
function Bc(e) {
	let t = new FormData();
	for (let [n, r] of Object.entries(e)) r != null && (Lc(r) || Mc(r, "Blob") ? t.append(n, r) : typeof r == "object" && r ? t.append(n, JSON.stringify(r)) : t.append(n, String(r)));
	return t;
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/files/client.js
var Vc = 2592e3, Hc = q([W().int().min(60).max(Vc), Y("persistent")]), Uc = /^[0-9a-f]{32}$/i, Wc = (e) => {
	let { baseUrl: t, apiKey: n, integration: i } = e, a = async (e, a) => {
		if (a?.ttlSeconds !== void 0 && !Hc.safeParse(a.ttlSeconds).success) throw p(`ttlSeconds must be an integer in [60, ${Vc}] or the literal "persistent"`);
		let o = new FormData();
		o.append("file", e), a?.ttlSeconds !== void 0 && o.append("ttl_seconds", String(a.ttlSeconds));
		let s = await fetch(`${t}/v1/files`, {
			method: "POST",
			headers: X({
				apiKey: n,
				integration: i
			}),
			body: o,
			signal: a?.signal
		});
		if (!s.ok) {
			let e = await s.text().catch(() => "Unknown error");
			throw r("FILES_UPLOAD_ERROR", `Failed to upload file: ${s.status} - ${e}`, { status: s.status });
		}
		return s.json();
	}, o = async (e) => {
		let a = await fetch(`${t}${e}`, {
			method: "GET",
			headers: X({
				apiKey: n,
				integration: i
			})
		});
		if (!a.ok) {
			let e = await a.text().catch(() => "Unknown error");
			throw r("FILES_GET_ERROR", `Failed to get file: ${a.status} - ${e}`, { status: a.status });
		}
		return a.json();
	};
	return {
		upload: a,
		get: (e) => o(`/v1/files/${encodeURIComponent(e)}`),
		getByMd5: async (e) => {
			if (!Uc.test(e)) throw p("md5 must be 32 hex characters");
			return o(`/v1/files/by-md5/${e.toLowerCase()}`);
		},
		delete: async (e) => {
			let a = await fetch(`${t}/v1/files/${encodeURIComponent(e)}`, {
				method: "DELETE",
				headers: X({
					apiKey: n,
					integration: i
				})
			});
			if (!a.ok) {
				let e = await a.text().catch(() => "Unknown error");
				throw r("FILES_DELETE_ERROR", `Failed to delete file: ${a.status} - ${e}`, { status: a.status });
			}
		}
	};
};
//#endregion
//#region web/node_modules/@decartai/sdk/dist/process/request.js
async function Gc({ baseUrl: e, apiKey: t, model: n, inputs: i, signal: a, integration: o }) {
	let s = Bc(i), c = `${e}${n.urlPath}`, l = X({
		apiKey: t,
		integration: o
	}), u = await fetch(c, {
		method: "POST",
		headers: l,
		body: s,
		signal: a
	});
	if (!u.ok) {
		let e = await zc(u);
		throw r("PROCESSING_ERROR", `Processing failed: ${u.status} - ${e}`);
	}
	return u.blob();
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/process/client.js
var Kc = (e) => {
	let { apiKey: t, baseUrl: n, integration: r } = e;
	return async (e) => {
		let { model: i, signal: a, ...o } = e, s = i.inputSchema.safeParse(o);
		if (!s.success) throw p(`Invalid inputs for ${i.name}: ${s.error.message}`);
		let c = {};
		for (let [e, t] of Object.entries(s.data)) c[e] = e === "data" || e === "start" || e === "end" || e === "reference_image" ? await Rc(t) : t;
		return await Gc({
			baseUrl: n,
			apiKey: t,
			model: i,
			inputs: c,
			signal: a,
			integration: r
		});
	};
}, qc = {
	interval: 1500,
	initialDelay: 500
};
function Jc(e) {
	return new Promise((t) => setTimeout(t, e));
}
async function Yc({ checkStatus: e, getContent: t, onStatusChange: n, signal: r }) {
	for (await Jc(qc.initialDelay);;) {
		if (r?.aborted) throw Error("Polling aborted");
		let i = await e();
		if (n && n(i), i.status === "completed") {
			let e = await t();
			return {
				status: "completed",
				job_id: i.job_id,
				data: e
			};
		}
		if (i.status === "failed") return {
			status: "failed",
			job_id: i.job_id,
			error: "Job failed"
		};
		await Jc(qc.interval);
	}
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/queue/request.js
async function Xc({ baseUrl: e, apiKey: t, model: n, inputs: r, signal: i, integration: a }) {
	let o = Bc(r);
	if (!n.queueUrlPath) throw h(`Model ${n.name} does not support queue processing`, 400);
	let s = `${e}${n.queueUrlPath}`, c = X({
		apiKey: t,
		integration: a
	}), l = await fetch(s, {
		method: "POST",
		headers: c,
		body: o,
		signal: i
	});
	if (!l.ok) {
		let e = await zc(l);
		throw h(`Failed to submit job: ${l.status} - ${e}`, l.status);
	}
	return l.json();
}
async function Zc({ baseUrl: e, apiKey: t, jobId: n, signal: r, integration: i }) {
	let a = `${e}/v1/jobs/${n}`, o = X({
		apiKey: t,
		integration: i
	}), s = await fetch(a, {
		method: "GET",
		headers: o,
		signal: r
	});
	if (!s.ok) {
		let e = await zc(s);
		throw g(`Failed to get job status: ${s.status} - ${e}`, s.status);
	}
	return s.json();
}
async function Qc({ baseUrl: e, apiKey: t, jobId: n, signal: r, integration: i }) {
	let a = `${e}/v1/jobs/${n}/content`, o = X({
		apiKey: t,
		integration: i
	}), s = await fetch(a, {
		method: "GET",
		headers: o,
		signal: r
	});
	if (!s.ok) {
		let e = await zc(s);
		throw _(`Failed to get job content: ${s.status} - ${e}`, s.status);
	}
	return s.blob();
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/queue/client.js
var $c = (e) => {
	let { apiKey: t, baseUrl: n, integration: r } = e, i = async (e) => {
		let { model: i, signal: a, ...o } = e, s = i.inputSchema.safeParse(o);
		if (!s.success) throw p(`Invalid inputs for ${i.name}: ${s.error.message}`);
		let c = {};
		for (let [e, t] of Object.entries(s.data)) c[e] = e === "data" || e === "start" || e === "end" || e === "reference_image" ? await Rc(t) : t;
		return Xc({
			baseUrl: n,
			apiKey: t,
			model: i,
			inputs: c,
			signal: a,
			integration: r
		});
	};
	return {
		submit: i,
		status: async (e) => Zc({
			baseUrl: n,
			apiKey: t,
			jobId: e,
			integration: r
		}),
		result: async (e) => Qc({
			baseUrl: n,
			apiKey: t,
			jobId: e,
			integration: r
		}),
		submitAndPoll: async (e) => {
			let { onStatusChange: a, signal: o, ...s } = e, c = await i(s);
			return a && a(c), Yc({
				checkStatus: () => Zc({
					baseUrl: n,
					apiKey: t,
					jobId: c.job_id,
					signal: o,
					integration: r
				}),
				getContent: () => Qc({
					baseUrl: n,
					apiKey: t,
					jobId: c.job_id,
					signal: o,
					integration: r
				}),
				onStatusChange: a,
				signal: o
			});
		}
	};
}, el = (e) => {
	let { baseUrl: t, apiKey: n, integration: i } = e;
	return {
		create: async (e) => {
			let a = {
				...X({
					apiKey: n,
					integration: i
				}),
				"content-type": "application/json"
			}, o = await fetch(`${t}/v1/client/tokens`, {
				method: "POST",
				headers: a,
				body: JSON.stringify(e ?? {})
			});
			if (!o.ok) {
				let e = await o.text().catch(() => "Unknown error");
				throw r("TOKEN_CREATE_ERROR", `Failed to create token: ${o.status} - ${e}`, { status: o.status });
			}
			return o.json();
		},
		verify: oe,
		decode: re
	};
}, tl = (e) => {
	let t = globalThis;
	if (t.process !== void 0) return t.process.env?.[e]?.trim();
	if (t.Deno !== void 0) return t.Deno.env?.get?.(e)?.trim();
}, nl = q([H().url(), H().startsWith("/")]), rl = K({
	apiKey: H().min(1).optional(),
	baseUrl: ws().optional(),
	proxy: nl.optional(),
	integration: H().optional(),
	realtimeBaseUrl: ws().optional()
}).refine((e) => {
	let t = !!e.proxy, n = !!e.apiKey;
	return !(t && n);
}, { message: "Cannot provide both 'proxy' and 'apiKey'. Use 'proxy' for proxy mode or 'apiKey' for direct API access." }), il = (e, t = {}) => {
	let n = rl.safeParse(t);
	if (!n.success) {
		let e = n.error.issues[0];
		throw e.path.includes("apiKey") ? i() : e.path.includes("baseUrl") || e.path.includes("realtimeBaseUrl") ? a(t[e.path.includes("realtimeBaseUrl") ? "realtimeBaseUrl" : "baseUrl"]) : e.path.includes("proxy") ? a(e.path.includes("proxy") ? t.proxy : void 0) : n.error;
	}
	let r = "proxy" in n.data && !!n.data.proxy, o = r ? void 0 : ("apiKey" in n.data ? n.data.apiKey : void 0) ?? tl("DECART_API_KEY");
	if (!r && !o) throw i();
	let s;
	s = r && "proxy" in n.data && n.data.proxy ? n.data.proxy : n.data.baseUrl || "https://api.decart.ai";
	let { integration: c } = n.data, l = "logger" in t && t.logger ? t.logger : S("info"), u = !("telemetry" in t && t.telemetry === !1), d = n.data.realtimeBaseUrl || "wss://api3.decart.ai", f = e({
		publishBaseUrl: d,
		subscribeBaseUrl: r || n.data.baseUrl !== void 0 ? s : d.replace(/^wss?:\/\//i, "https://"),
		apiKey: o || "",
		integration: c,
		logger: l,
		telemetryEnabled: u
	}), p = Kc({
		baseUrl: s,
		apiKey: o || "",
		integration: c
	}), m = $c({
		baseUrl: s,
		apiKey: o || "",
		integration: c
	}), h = el({
		baseUrl: s,
		apiKey: o || "",
		integration: c
	}), g = Wc({
		baseUrl: s,
		apiKey: o || "",
		integration: c
	});
	return {
		realtime: {
			connect: f.connect,
			subscribe: f.subscribe,
			checkConnectivity: f.checkConnectivity
		},
		process: p,
		queue: m,
		tokens: h,
		files: g
	};
};
J([
	"lucy-2.1",
	"lucy-2.5",
	"lucy-vton-3.5",
	"lucy-restyle-2"
]), J([
	"lucy-clip",
	"lucy-2.1",
	"lucy-2.5",
	"lucy-vton-3.5",
	"lucy-restyle-2"
]), J(["lucy-image-2"]), J([
	"lucy-2.1",
	"lucy-2.5",
	"lucy-vton-3.5",
	"lucy-restyle-2",
	"lucy-clip",
	"lucy-image-2"
]);
var al = {
	"lucy-pro-v2v": "lucy-clip",
	"lucy-restyle-v2v": "lucy-restyle-2",
	"lucy-pro-i2i": "lucy-image-2"
}, ol = /* @__PURE__ */ new Set();
function sl(e) {
	let t = al[e];
	t && !ol.has(e) && (ol.add(e), console.warn(`[Decart SDK] Model "${e}" is deprecated. Use "${t}" instead. See https://docs.platform.decart.ai/models for details.`));
}
q([
	q([
		Y("lucy-2.1"),
		Y("lucy-2.5"),
		Y("lucy-vton-3.5"),
		Y("lucy-restyle-2"),
		Y("lucy-latest"),
		Y("lucy-vton-latest"),
		Y("lucy-restyle-latest")
	]),
	q([
		Y("lucy-clip"),
		Y("lucy-2.1"),
		Y("lucy-2.5"),
		Y("lucy-vton-3.5"),
		Y("lucy-restyle-2"),
		Y("lucy-latest"),
		Y("lucy-vton-latest"),
		Y("lucy-restyle-latest"),
		Y("lucy-clip-latest"),
		Y("lucy-pro-v2v"),
		Y("lucy-restyle-v2v")
	]),
	q([
		Y("lucy-image-2"),
		Y("lucy-image-latest"),
		Y("lucy-pro-i2i")
	])
]);
var cl = q([
	Nc("File"),
	Nc("Blob"),
	Nc("ReadableStream"),
	Nc("URL"),
	ws(),
	K({
		uri: H(),
		type: H(),
		name: H()
	})
]), ll = () => J(["720p", "480p"]).optional().describe("The resolution to use for the generation").default("720p"), ul = Y("720p").optional().describe("The resolution to use for the generation").default("720p"), dl = K({
	prompt: H().min(1).describe("The prompt to use for the generation"),
	data: cl.describe("The video data to use for generation (File, Blob, ReadableStream, URL, or string URL). Output video is limited to 5 seconds."),
	reference_image: cl.optional().describe("Optional reference image to guide what to add to the video (File, Blob, ReadableStream, URL, or string URL)"),
	seed: W().optional().describe("The seed to use for the generation"),
	resolution: ul,
	enhance_prompt: G().optional().describe("Whether to enhance the prompt")
}), fl = K({
	prompt: H().min(1).max(1e3).describe("The prompt to use for the generation"),
	data: cl.describe("The image data to use for generation (File, Blob, ReadableStream, URL, or string URL)"),
	reference_image: cl.optional().describe("Optional reference image to guide the edit (File, Blob, ReadableStream, URL, or string URL)"),
	seed: W().optional().describe("The seed to use for the generation"),
	resolution: ll(),
	enhance_prompt: G().optional().describe("Whether to enhance the prompt")
}), pl = K({
	prompt: H().min(1).optional().describe("Text prompt for the video editing"),
	reference_image: cl.optional().describe("Reference image to transform into a prompt (File, Blob, ReadableStream, URL, or string URL)"),
	data: cl.describe("Video file to process (File, Blob, ReadableStream, URL, or string URL)"),
	seed: W().optional().describe("Seed for the video generation"),
	resolution: ul,
	enhance_prompt: G().optional().describe("Whether to enhance the prompt (only valid with text prompt, defaults to true on backend)")
}).refine((e) => e.prompt !== void 0 != (e.reference_image !== void 0), { message: "Must provide either 'prompt' or 'reference_image', but not both" }).refine((e) => e.reference_image === void 0 || e.enhance_prompt === void 0, { message: "'enhance_prompt' is only valid when using 'prompt', not 'reference_image'" }), ml = K({
	prompt: H().describe("Text prompt for the video editing. Send an empty string if you want no text prompt."),
	reference_image: cl.optional().describe("Optional reference image to guide the edit (File, Blob, ReadableStream, URL, or string URL)"),
	data: cl.describe("Video file to process (File, Blob, ReadableStream, URL, or string URL)"),
	seed: W().optional().describe("The seed to use for the generation"),
	resolution: ul,
	enhance_prompt: G().optional().describe("Whether to enhance the prompt")
}), Z = {
	"lucy-clip": dl,
	"lucy-image-2": fl,
	"lucy-restyle-2": pl,
	"lucy-2.1": ml,
	"lucy-2.5": ml,
	"lucy-vton-3.5": ml,
	"lucy-latest": ml,
	"lucy-vton-latest": ml,
	"lucy-restyle-latest": pl,
	"lucy-clip-latest": dl,
	"lucy-image-latest": fl,
	"lucy-pro-v2v": dl,
	"lucy-pro-i2i": fl,
	"lucy-restyle-v2v": pl
}, hl = J(["fast"]);
function gl(e, t = 30) {
	return typeof e == "number" ? e : e.ideal ?? e.max ?? e.exact ?? e.min ?? t;
}
var _l = K({
	name: H(),
	urlPath: H(),
	queueUrlPath: H().optional(),
	fps: q([W().min(1), K({
		max: W().min(1).optional(),
		min: W().min(1).optional(),
		ideal: W().min(1).optional(),
		exact: W().min(1).optional()
	})]),
	width: W().min(1),
	height: W().min(1),
	inputSchema: qs().optional(),
	supportedSpeeds: $s(hl).readonly().optional()
}), vl = {
	realtime: {
		"lucy-2.1": {
			urlPath: "/v1/stream",
			name: "lucy-2.1",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1088,
			height: 624,
			inputSchema: K({})
		},
		"lucy-2.5": {
			urlPath: "/v1/stream",
			name: "lucy-2.5",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1280,
			height: 720,
			inputSchema: K({}),
			supportedSpeeds: ["fast"]
		},
		"lucy-vton-3.5": {
			urlPath: "/v1/stream",
			name: "lucy-vton-3.5",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1280,
			height: 720,
			inputSchema: K({}),
			supportedSpeeds: ["fast"]
		},
		"lucy-restyle-2": {
			urlPath: "/v1/stream",
			name: "lucy-restyle-2",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1280,
			height: 704,
			inputSchema: K({})
		},
		"lucy-latest": {
			urlPath: "/v1/stream",
			name: "lucy-latest",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1088,
			height: 624,
			inputSchema: K({}),
			supportedSpeeds: ["fast"]
		},
		"lucy-vton-latest": {
			urlPath: "/v1/stream",
			name: "lucy-vton-latest",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1280,
			height: 720,
			inputSchema: K({}),
			supportedSpeeds: ["fast"]
		},
		"lucy-restyle-latest": {
			urlPath: "/v1/stream",
			name: "lucy-restyle-latest",
			fps: {
				ideal: 30,
				max: 30
			},
			width: 1280,
			height: 704,
			inputSchema: K({})
		}
	},
	image: {
		"lucy-image-2": {
			urlPath: "/v1/generate/lucy-image-2",
			queueUrlPath: "/v1/jobs/lucy-image-2",
			name: "lucy-image-2",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-image-2"]
		},
		"lucy-image-latest": {
			urlPath: "/v1/generate/lucy-image-latest",
			queueUrlPath: "/v1/jobs/lucy-image-latest",
			name: "lucy-image-latest",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-image-latest"]
		},
		"lucy-pro-i2i": {
			urlPath: "/v1/generate/lucy-pro-i2i",
			queueUrlPath: "/v1/jobs/lucy-pro-i2i",
			name: "lucy-pro-i2i",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-pro-i2i"]
		}
	},
	video: {
		"lucy-clip": {
			urlPath: "/v1/generate/lucy-clip",
			queueUrlPath: "/v1/jobs/lucy-clip",
			name: "lucy-clip",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-clip"]
		},
		"lucy-2.1": {
			urlPath: "/v1/generate/lucy-2.1",
			queueUrlPath: "/v1/jobs/lucy-2.1",
			name: "lucy-2.1",
			fps: 20,
			width: 1088,
			height: 624,
			inputSchema: Z["lucy-2.1"]
		},
		"lucy-2.5": {
			urlPath: "/v1/generate/lucy-2.5",
			queueUrlPath: "/v1/jobs/lucy-2.5",
			name: "lucy-2.5",
			fps: 20,
			width: 1280,
			height: 720,
			inputSchema: Z["lucy-2.5"]
		},
		"lucy-vton-3.5": {
			urlPath: "/v1/generate/lucy-vton-3.5",
			queueUrlPath: "/v1/jobs/lucy-vton-3.5",
			name: "lucy-vton-3.5",
			fps: 20,
			width: 1280,
			height: 720,
			inputSchema: Z["lucy-vton-3.5"]
		},
		"lucy-restyle-2": {
			urlPath: "/v1/generate/lucy-restyle-2",
			queueUrlPath: "/v1/jobs/lucy-restyle-2",
			name: "lucy-restyle-2",
			fps: 22,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-restyle-2"]
		},
		"lucy-latest": {
			urlPath: "/v1/generate/lucy-latest",
			queueUrlPath: "/v1/jobs/lucy-latest",
			name: "lucy-latest",
			fps: 20,
			width: 1088,
			height: 624,
			inputSchema: Z["lucy-latest"]
		},
		"lucy-vton-latest": {
			urlPath: "/v1/generate/lucy-vton-latest",
			queueUrlPath: "/v1/jobs/lucy-vton-latest",
			name: "lucy-vton-latest",
			fps: 20,
			width: 1280,
			height: 720,
			inputSchema: Z["lucy-vton-latest"]
		},
		"lucy-restyle-latest": {
			urlPath: "/v1/generate/lucy-restyle-latest",
			queueUrlPath: "/v1/jobs/lucy-restyle-latest",
			name: "lucy-restyle-latest",
			fps: 22,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-restyle-latest"]
		},
		"lucy-clip-latest": {
			urlPath: "/v1/generate/lucy-clip-latest",
			queueUrlPath: "/v1/jobs/lucy-clip-latest",
			name: "lucy-clip-latest",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-clip-latest"]
		},
		"lucy-pro-v2v": {
			urlPath: "/v1/generate/lucy-pro-v2v",
			queueUrlPath: "/v1/jobs/lucy-pro-v2v",
			name: "lucy-pro-v2v",
			fps: 25,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-pro-v2v"]
		},
		"lucy-restyle-v2v": {
			urlPath: "/v1/generate/lucy-restyle-v2v",
			queueUrlPath: "/v1/jobs/lucy-restyle-v2v",
			name: "lucy-restyle-v2v",
			fps: 22,
			width: 1280,
			height: 704,
			inputSchema: Z["lucy-restyle-v2v"]
		}
	}
}, yl = {
	realtime: (e) => {
		sl(e);
		let t = vl.realtime[e];
		if (!t) throw m(e);
		return t;
	},
	video: (e) => {
		sl(e);
		let t = vl.video[e];
		if (!t) throw m(e);
		return t;
	},
	image: (e) => {
		sl(e);
		let t = vl.image[e];
		if (!t) throw m(e);
		return t;
	}
}, bl = (e) => typeof e == "string" && e.startsWith("file_"), xl = K({
	prompt: K({
		text: H().min(1),
		enhance: G().optional().default(!0)
	}).optional(),
	image: q([
		Nc("Blob"),
		Nc("File"),
		H()
	]).optional(),
	passthrough: G().optional()
});
//#endregion
//#region web/node_modules/@decartai/sdk/dist/utils/media.js
async function Sl(e) {
	return new Promise((t, n) => {
		let r = new FileReader();
		r.onloadend = () => {
			let e = r.result;
			if (typeof e != "string") {
				n(/* @__PURE__ */ Error("FileReader did not return a string"));
				return;
			}
			let i = e.split(",")[1];
			if (!i) {
				n(/* @__PURE__ */ Error("Invalid data URL format"));
				return;
			}
			t(i);
		}, r.onerror = n, r.readAsDataURL(e);
	});
}
async function Cl(e) {
	if (typeof e == "string") {
		let t = null;
		try {
			t = new URL(e);
		} catch {}
		if (t?.protocol === "data:") {
			let [, t] = e.split(",", 2);
			if (!t) throw Error("Invalid data URL image");
			return t;
		}
		if (t?.protocol === "http:" || t?.protocol === "https:") {
			let t = await fetch(e);
			if (!t.ok) throw Error(`Failed to fetch image: ${t.status} ${t.statusText}`);
			return Sl(await t.blob());
		}
		if (t) throw Error(`Unsupported image URL scheme: ${t.protocol}`);
		return e;
	}
	return Sl(e);
}
//#endregion
//#region web/node_modules/mitt/dist/mitt.mjs
function wl(e) {
	return {
		all: e ||= /* @__PURE__ */ new Map(),
		on: function(t, n) {
			var r = e.get(t);
			r ? r.push(n) : e.set(t, [n]);
		},
		off: function(t, n) {
			var r = e.get(t);
			r && (n ? r.splice(r.indexOf(n) >>> 0, 1) : e.set(t, []));
		},
		emit: function(t, n) {
			var r = e.get(t);
			r && r.slice().map(function(e) {
				e(n);
			}), (r = e.get("*")) && r.slice().map(function(e) {
				e(t, n);
			});
		}
	};
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/event-buffer.js
function Tl() {
	let e = wl(), t = [], n = !0;
	return {
		emitter: e,
		emitOrBuffer: (r, i) => {
			n ? t.push({
				event: r,
				data: i
			}) : e.emit(r, i);
		},
		flush: () => {
			setTimeout(() => {
				n = !1;
				for (let { event: n, data: r } of t) e.emit(n, r);
				t.length = 0;
			}, 0);
		},
		stop: () => {
			n = !1, t.length = 0;
		}
	};
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/config-realtime.js
var El = 11e5, Dl = 35e5, Ol = 61e4, kl = .8;
function Al(e) {
	return Math.round((e + Ol) / kl / 1e3);
}
var Q = {
	signaling: {
		connectTimeoutMs: 6e4,
		handshakeTimeoutMs: 15e3,
		requestTimeoutMs: 3e4
	},
	session: {
		connectionTimeoutMs: 3e5,
		retry: {
			retries: 5,
			factor: 2,
			minTimeout: 1e3,
			maxTimeout: 1e4
		},
		terminalEndReasons: ["moderation_violation", "insufficient_credits"],
		terminalCloseCode: 1008,
		permanentErrorSubstrings: [
			"permission denied",
			"not allowed",
			"invalid session",
			"401",
			"invalid api key",
			"unauthorized",
			"failed to create livekit frame-metadata worker"
		]
	},
	methods: {
		promptTimeoutMs: 15e3,
		updateTimeoutMs: 3e4
	},
	livekit: {
		inferenceServerIdentityPrefix: "inference-server-",
		roomOptions: {
			adaptiveStream: !1,
			dynacast: !1
		},
		defaultVideoCodec: "h264",
		defaultMaxVideoBitrateBps: Dl,
		vp9MaxVideoBitrateBps: 3e6,
		minVideoBitrateBps: El,
		simulcastLowerLayersBitrateBps: Ol,
		bweVideoShare: kl,
		defaultPublishFps: 30
	},
	observability: {
		stallFpsThreshold: .5,
		statsDefaultIntervalMs: 1e3,
		statsMinIntervalMs: 500,
		telemetryReportIntervalMs: 1e4,
		telemetryUrl: "https://platform.decart.ai/api/v1/telemetry",
		telemetryMaxItemsPerReport: 120,
		connectionQuality: {
			windowSamples: 5,
			warmupSamples: 8,
			downgradeConsecutive: 5,
			upgradeConsecutive: 5,
			rtt: {
				goodMs: 150,
				fairMs: 300,
				poorMs: 500,
				relayExtraMs: 100
			},
			glassToGlass: {
				goodMs: 500,
				fairMs: 900,
				poorMs: 1500
			},
			ttff: {
				goodMs: 4e3,
				fairMs: 6e3,
				poorMs: 1e4
			},
			loss: {
				good: .001,
				fair: .01,
				poor: .05
			},
			g2gDrop: {
				good: .001,
				fair: .01,
				poor: .05
			},
			upstream: {
				goodKbps: Al(Dl),
				fairKbps: Al(El),
				poorKbps: Al(El / 2)
			},
			stall: {
				goodFps: 20,
				fairFps: 12,
				poorFps: 5
			}
		}
	},
	preflight: {
		defaultStunUrls: ["stun:stun.l.google.com:19302"],
		iceGatherTimeoutMs: 5e3,
		rtt: {
			goodMs: 150,
			marginalMs: 300
		},
		active: {
			durationMs: 12e3,
			minSamples: 5
		}
	}
}, jl = K({
	prompt: H().min(1).optional(),
	enhance: G().optional().default(!0),
	image: q([
		Nc("Blob"),
		Nc("File"),
		H(),
		Gs()
	]).optional()
}).refine((e) => e.prompt !== void 0 || e.image !== void 0, { message: "At least one of 'prompt' or 'image' must be provided" }), Ml = K({
	prompt: H().min(1),
	enhance: G().optional().default(!0)
}), Nl = (e, t) => ({
	set: async (n) => {
		let r = jl.safeParse(n);
		if (!r.success) throw r.error;
		let { prompt: i, enhance: a, image: o } = r.data, s = {
			prompt: i,
			enhance: a,
			timeout: Q.methods.updateTimeoutMs
		};
		if (bl(o)) {
			await e.setImage({
				kind: "ref",
				ref: o
			}, s);
			return;
		}
		let c = o == null ? null : await t(o);
		await e.setImage({
			kind: "data",
			data: c
		}, s);
	},
	setPrompt: async (t, { enhance: n } = {}) => {
		let r = Ml.safeParse({
			prompt: t,
			enhance: n
		});
		if (!r.success) throw r.error;
		await e.sendPrompt(r.data.prompt, {
			enhance: r.data.enhance,
			timeout: Q.methods.promptTimeoutMs
		});
	},
	replaceVideoTrack: async (t) => {
		await e.replaceVideoTrack(t);
	}
});
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/signaling-channel.js
function Pl(e) {
	if (!e) return null;
	if (e.imageRef !== void 0 || e.image !== void 0) {
		let t = e.imageRef === void 0 ? {
			type: "set_image",
			image_data: e.image ?? null
		} : {
			type: "set_image",
			image_ref: e.imageRef
		};
		return e.prompt !== void 0 && (t.prompt = e.prompt), e.enhance !== void 0 && (t.enhance_prompt = e.enhance), {
			message: t,
			matchAck: (e) => e.type === "set_image_ack",
			label: "Image send"
		};
	}
	if (e.prompt !== void 0 && e.prompt !== null) {
		let t = e.prompt;
		return {
			message: {
				type: "prompt",
				prompt: t,
				enhance_prompt: e.enhance ?? !0
			},
			matchAck: (e) => e.type === "prompt_ack" && e.prompt === t,
			label: "Prompt send"
		};
	}
	return null;
}
var Fl = class {
	config;
	ws = null;
	events = wl();
	pendingAcks = [];
	bufferedAcks = [];
	pendingRoomInfo = null;
	connected = !1;
	closing = !1;
	logger;
	constructor(e) {
		this.config = e, this.logger = e.logger ?? S("warn");
	}
	on(e, t) {
		this.events.on(e, t);
	}
	off(e, t) {
		this.events.off(e, t);
	}
	async openAndJoin(e = {}) {
		let t = e.connectTimeout ?? Q.signaling.connectTimeoutMs, n = e.handshakeTimeout ?? Q.signaling.handshakeTimeoutMs;
		this.config.observability?.startPhase("websocket-open"), await this.openSocket(t), this.config.observability?.endPhase("websocket-open", { success: !0 }), this.config.observability?.startPhase("room-join");
		let r = this.waitForRoomInfo(n), i = Pl(e.initialState), a = e.initialState != null && (e.initialState.image != null || e.initialState.imageRef != null || e.initialState.prompt != null), o = {
			type: "livekit_join",
			passthrough: e.passthrough ?? !a,
			...e.frameTiming ? { client_capabilities: { frame_timing: !0 } } : {}
		};
		if (!this.writeMessage(o) || i && !this.writeMessage(i.message)) throw r.cancel(), Error("WebSocket is not open");
		let s;
		try {
			s = await r.promise;
		} catch (e) {
			throw this.rejectAllPending(e instanceof Error ? e : Error(String(e))), e;
		}
		this.config.observability?.endPhase("room-join", { success: !0 }), this.connected = !0;
		let c = i ? this.flushInitialState(i) : Promise.resolve();
		return c.catch(() => {}), {
			roomInfo: s,
			initialStateAck: c
		};
	}
	async flushInitialState(e) {
		this.config.observability?.startPhase("initial-state-handshake");
		let t = await this.request({
			message: e.message,
			matchAck: e.matchAck,
			timeoutMs: Q.signaling.requestTimeoutMs,
			label: e.label,
			write: !1
		});
		if (this.config.observability?.endPhase("initial-state-handshake", { success: !0 }), !t.success) throw Error(t.error ?? `Failed: ${e.label}`);
	}
	close() {
		this.closing = !0, this.connected = !1;
		let e = this.ws;
		if (this.ws = null, e) try {
			e.close();
		} catch {}
		this.rejectPendingRoomInfo(/* @__PURE__ */ Error("Control channel closed")), this.rejectAllPending(/* @__PURE__ */ Error("Control channel closed"));
	}
	async sendPrompt(e, t = {}) {
		let n = await this.request({
			message: {
				type: "prompt",
				prompt: e,
				enhance_prompt: t.enhance ?? !0
			},
			matchAck: (t) => t.type === "prompt_ack" && t.prompt === e,
			timeoutMs: t.timeout ?? Q.signaling.requestTimeoutMs,
			label: "Prompt send"
		});
		if (!n.success) throw Error(n.error ?? "Failed to send prompt");
	}
	async setImage(e, t = {}) {
		let n = e.kind === "ref" ? {
			type: "set_image",
			image_ref: e.ref
		} : {
			type: "set_image",
			image_data: e.data
		};
		t.prompt !== void 0 && (n.prompt = t.prompt), t.enhance !== void 0 && (n.enhance_prompt = t.enhance);
		let r = await this.request({
			message: n,
			matchAck: (e) => e.type === "set_image_ack",
			timeoutMs: t.timeout ?? Q.signaling.requestTimeoutMs,
			label: "Image send"
		});
		if (!r.success) throw Error(r.error ?? "Failed to send image");
	}
	async openSocket(e) {
		let t = encodeURIComponent(Ic(this.config.integration)), n = this.config.url.includes("?") ? "&" : "?", r = `${this.config.url}${n}user_agent=${t}`;
		this.closing = !1, await new Promise((t, n) => {
			let i = setTimeout(() => n(/* @__PURE__ */ Error(`WebSocket open timeout (${e}ms)`)), e), a = new WebSocket(r);
			this.ws = a, a.onopen = () => {
				clearTimeout(i), t();
			}, a.onclose = (e) => {
				clearTimeout(i);
				let t = this.connected, r = this.pendingAcks.length;
				this.connected = !1, this.ws = null, this.logger.warn("signaling: websocket closed", {
					code: e.code,
					reason: e.reason,
					wasConnected: t,
					closing: this.closing,
					pendingAcks: r
				});
				let a = /* @__PURE__ */ Error(`WebSocket closed: ${e.code} ${e.reason}`);
				this.rejectPendingRoomInfo(a), this.rejectAllPending(a), t || this.closing ? this.events.emit("closed", {
					code: e.code,
					reason: e.reason
				}) : n(a);
			}, a.onerror = () => {}, a.onmessage = (e) => {
				try {
					this.handleMessage(JSON.parse(e.data));
				} catch {}
			};
		});
	}
	waitForRoomInfo(e) {
		let t = () => {};
		return {
			promise: new Promise((n, r) => {
				let i = setTimeout(() => {
					t(), this.logger.warn("signaling: livekit_room_info timeout", { timeoutMs: e }), r(/* @__PURE__ */ Error(`livekit_room_info timeout (${e}ms)`));
				}, e), a = {
					resolve: (e) => {
						t(), n(e);
					},
					reject: (e) => {
						t(), r(e);
					},
					cancel: () => {
						t();
					},
					pauseTimeout: () => {
						i &&= (clearTimeout(i), null);
					}
				};
				t = () => {
					i &&= (clearTimeout(i), null), this.pendingRoomInfo === a && (this.pendingRoomInfo = null);
				}, this.pendingRoomInfo = a;
			}),
			cancel: t
		};
	}
	async request({ message: e, matchAck: t, timeoutMs: n, label: r, write: i = !0 }) {
		return new Promise((a, o) => {
			let s = this.bufferedAcks.findIndex((e) => t(e));
			if (s !== -1) {
				let [e] = this.bufferedAcks.splice(s, 1);
				a(e);
				return;
			}
			let c = setTimeout(() => {
				u(), this.logger.warn("signaling: ack timed out", {
					label: r,
					timeoutMs: n
				}), o(/* @__PURE__ */ Error(`${r} timed out`));
			}, n), l = {
				matches: t,
				onMatch: (e) => {
					u(), a(e);
				},
				reject: (e) => {
					u(), o(e);
				}
			}, u = () => {
				clearTimeout(c), this.pendingAcks = this.pendingAcks.filter((e) => e !== l);
			};
			this.pendingAcks.push(l), i && !this.writeMessage(e) && (u(), o(/* @__PURE__ */ Error("WebSocket is not open")));
		});
	}
	writeMessage(e) {
		return this.ws?.readyState === WebSocket.OPEN && (this.ws.send(JSON.stringify(e)), !0);
	}
	handleMessage(e) {
		for (let t of [...this.pendingAcks]) if (t.matches(e)) {
			t.onMatch(e);
			return;
		}
		if (!this.connected && (e.type === "set_image_ack" || e.type === "prompt_ack")) {
			this.bufferedAcks.push(e);
			return;
		}
		switch (e.type) {
			case "livekit_room_info":
				this.resolvePendingRoomInfo({
					livekitUrl: e.livekit_url,
					token: e.token,
					roomName: e.room_name,
					sessionId: e.session_id
				});
				break;
			case "queue_position":
				this.pendingRoomInfo?.pauseTimeout(), this.events.emit("queuePosition", {
					position: e.position,
					queueSize: e.queue_size
				});
				break;
			case "generation_started":
				this.events.emit("generationStarted");
				break;
			case "generation_tick":
				this.events.emit("generationTick", { seconds: e.seconds });
				break;
			case "generation_ended":
				this.events.emit("generationEnded", {
					seconds: e.seconds,
					reason: e.reason
				});
				break;
			case "error": {
				let t = Error(e.error);
				t.source = "server", this.logger.error("signaling: server error received", { error: e.error }), this.events.emit("serverError", t), this.rejectPendingRoomInfo(t), this.rejectAllPending(t);
				break;
			}
		}
	}
	resolvePendingRoomInfo(e) {
		let t = this.pendingRoomInfo;
		t && t.resolve(e);
	}
	rejectPendingRoomInfo(e) {
		let t = this.pendingRoomInfo;
		t && t.reject(e);
	}
	rejectAllPending(e) {
		let t = this.pendingAcks;
		this.pendingAcks = [], this.bufferedAcks = [];
		for (let n of t) n.reject(e);
	}
}, Il = /* @__PURE__ */ t(((e, t) => {
	function n(e, t) {
		typeof t == "boolean" && (t = { forever: t }), this._originalTimeouts = JSON.parse(JSON.stringify(e)), this._timeouts = e, this._options = t || {}, this._maxRetryTime = t && t.maxRetryTime || Infinity, this._fn = null, this._errors = [], this._attempts = 1, this._operationTimeout = null, this._operationTimeoutCb = null, this._timeout = null, this._operationStart = null, this._timer = null, this._options.forever && (this._cachedTimeouts = this._timeouts.slice(0));
	}
	t.exports = n, n.prototype.reset = function() {
		this._attempts = 1, this._timeouts = this._originalTimeouts.slice(0);
	}, n.prototype.stop = function() {
		this._timeout && clearTimeout(this._timeout), this._timer && clearTimeout(this._timer), this._timeouts = [], this._cachedTimeouts = null;
	}, n.prototype.retry = function(e) {
		if (this._timeout && clearTimeout(this._timeout), !e) return !1;
		var t = (/* @__PURE__ */ new Date()).getTime();
		if (e && t - this._operationStart >= this._maxRetryTime) return this._errors.push(e), this._errors.unshift(/* @__PURE__ */ Error("RetryOperation timeout occurred")), !1;
		this._errors.push(e);
		var n = this._timeouts.shift();
		if (n === void 0) {
			if (this._cachedTimeouts) this._errors.splice(0, this._errors.length - 1), n = this._cachedTimeouts.slice(-1);
			else return !1;
		}
		var r = this;
		return this._timer = setTimeout(function() {
			r._attempts++, r._operationTimeoutCb && (r._timeout = setTimeout(function() {
				r._operationTimeoutCb(r._attempts);
			}, r._operationTimeout), r._options.unref && r._timeout.unref()), r._fn(r._attempts);
		}, n), this._options.unref && this._timer.unref(), !0;
	}, n.prototype.attempt = function(e, t) {
		this._fn = e, t && (t.timeout && (this._operationTimeout = t.timeout), t.cb && (this._operationTimeoutCb = t.cb));
		var n = this;
		this._operationTimeoutCb && (this._timeout = setTimeout(function() {
			n._operationTimeoutCb();
		}, n._operationTimeout)), this._operationStart = (/* @__PURE__ */ new Date()).getTime(), this._fn(this._attempts);
	}, n.prototype.try = function(e) {
		console.log("Using RetryOperation.try() is deprecated"), this.attempt(e);
	}, n.prototype.start = function(e) {
		console.log("Using RetryOperation.start() is deprecated"), this.attempt(e);
	}, n.prototype.start = n.prototype.try, n.prototype.errors = function() {
		return this._errors;
	}, n.prototype.attempts = function() {
		return this._attempts;
	}, n.prototype.mainError = function() {
		if (this._errors.length === 0) return null;
		for (var e = {}, t = null, n = 0, r = 0; r < this._errors.length; r++) {
			var i = this._errors[r], a = i.message, o = (e[a] || 0) + 1;
			e[a] = o, o >= n && (t = i, n = o);
		}
		return t;
	};
})), Ll = /* @__PURE__ */ t(((e) => {
	var t = Il();
	e.operation = function(n) {
		return new t(e.timeouts(n), {
			forever: n && (n.forever || n.retries === Infinity),
			unref: n && n.unref,
			maxRetryTime: n && n.maxRetryTime
		});
	}, e.timeouts = function(e) {
		if (e instanceof Array) return [].concat(e);
		var t = {
			retries: 10,
			factor: 2,
			minTimeout: 1e3,
			maxTimeout: Infinity,
			randomize: !1
		};
		for (var n in e) t[n] = e[n];
		if (t.minTimeout > t.maxTimeout) throw Error("minTimeout is greater than maxTimeout");
		for (var r = [], i = 0; i < t.retries; i++) r.push(this.createTimeout(i, t));
		return e && e.forever && !r.length && r.push(this.createTimeout(i, t)), r.sort(function(e, t) {
			return e - t;
		}), r;
	}, e.createTimeout = function(e, t) {
		var n = t.randomize ? Math.random() + 1 : 1, r = Math.round(n * Math.max(t.minTimeout, 1) * t.factor ** +e);
		return r = Math.min(r, t.maxTimeout), r;
	}, e.wrap = function(t, n, r) {
		if (n instanceof Array && (r = n, n = null), !r) for (var i in r = [], t) typeof t[i] == "function" && r.push(i);
		for (var a = 0; a < r.length; a++) {
			var o = r[a], s = t[o];
			t[o] = function(r) {
				var i = e.operation(n), a = Array.prototype.slice.call(arguments, 1), o = a.pop();
				a.push(function(e) {
					i.retry(e) || (e && (arguments[0] = i.mainError()), o.apply(this, arguments));
				}), i.attempt(function() {
					r.apply(t, a);
				});
			}.bind(t, s), t[o].options = n;
		}
	};
})), Rl = /* @__PURE__ */ e((/* @__PURE__ */ t(((e, t) => {
	t.exports = Ll();
})))(), 1), zl = Object.prototype.toString, Bl = (e) => zl.call(e) === "[object Error]", Vl = /* @__PURE__ */ new Set([
	"network error",
	"NetworkError when attempting to fetch resource.",
	"The Internet connection appears to be offline.",
	"Network request failed",
	"fetch failed",
	"terminated",
	" A network error occurred.",
	"Network connection lost"
]);
function Hl(e) {
	if (!(e && Bl(e) && e.name === "TypeError" && typeof e.message == "string")) return !1;
	let { message: t, stack: n } = e;
	return t === "Load failed" || t.startsWith("Load failed (") && t.endsWith(")") ? n === void 0 || "__sentry_captured__" in e : t.startsWith("error sending request for url") || t === "Failed to fetch" || t.startsWith("Failed to fetch (") && t.endsWith(")") ? !0 : Vl.has(t);
}
//#endregion
//#region web/node_modules/p-retry/index.js
var Ul = class extends Error {
	constructor(e) {
		super(), e instanceof Error ? (this.originalError = e, {message: e} = e) : (this.originalError = Error(e), this.originalError.stack = this.stack), this.name = "AbortError", this.message = e;
	}
}, Wl = (e, t, n) => {
	let r = n.retries - (t - 1);
	return e.attemptNumber = t, e.retriesLeft = r, e;
};
async function Gl(e, t) {
	return new Promise((n, r) => {
		t = { ...t }, t.onFailedAttempt ??= () => {}, t.shouldRetry ??= () => !0, t.retries ??= 10;
		let i = Rl.operation(t), a = () => {
			i.stop(), r(t.signal?.reason);
		};
		t.signal && !t.signal.aborted && t.signal.addEventListener("abort", a, { once: !0 });
		let o = () => {
			t.signal?.removeEventListener("abort", a), i.stop();
		};
		i.attempt(async (a) => {
			try {
				let t = await e(a);
				o(), n(t);
			} catch (e) {
				try {
					if (!(e instanceof Error)) throw TypeError(`Non-error was thrown: "${e}". You should only throw errors.`);
					if (e instanceof Ul) throw e.originalError;
					if (e instanceof TypeError && !Hl(e)) throw e;
					if (Wl(e, a, t), await t.shouldRetry(e) || (i.stop(), r(e)), await t.onFailedAttempt(e), !i.retry(e)) throw i.mainError();
				} catch (e) {
					Wl(e, a, t), o(), r(e);
				}
			}
		});
	});
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/stream-session.js
function Kl(e) {
	return e !== void 0 && Q.session.terminalEndReasons.includes(e);
}
function ql(e) {
	return e.code === Q.session.terminalCloseCode ? "policy_violation" : null;
}
function Jl(e) {
	if (!(e instanceof Error)) return null;
	let t = `websocket closed: ${Q.session.terminalCloseCode}`;
	return e.message.toLowerCase().includes(t) ? "policy_violation" : null;
}
function Yl(e, t = {}) {
	return btoa(JSON.stringify({
		room_name: e,
		...t.frameTiming ? { frame_timing: !0 } : {}
	}));
}
function Xl(e) {
	if (!e) return null;
	let t = e.indexOf(","), n = t >= 0 && e.startsWith("data:") ? e.slice(t + 1) : e, r = n.endsWith("==") ? 2 : +!!n.endsWith("="), i = Math.floor(n.length * 3 / 4) - r;
	return Math.max(0, Math.round(i / 1024));
}
var Zl = class {
	config;
	signaling;
	media;
	events = wl();
	state = "disconnected";
	queue = null;
	disposed = !1;
	currentAttempt = 0;
	teardownGeneration = 0;
	terminalEndReason = null;
	appliedState = null;
	logger;
	constructor(e) {
		this.config = e, this.logger = e.logger ?? S("warn"), this.createTransport();
	}
	on(e, t) {
		this.events.on(e, t);
	}
	off(e, t) {
		this.events.off(e, t);
	}
	getStatus() {
		return {
			connection: this.state,
			queue: this.queue
		};
	}
	getConnectionState() {
		return this.state;
	}
	isConnected() {
		return this.state === "connected" || this.state === "generating";
	}
	async connect() {
		this.disposed = !1, this.terminalEndReason = null;
		let e = ++this.currentAttempt;
		this.setState("connecting"), this.logger.info("realtime connect: starting", { attemptCycle: e });
		try {
			await Gl(() => this.runOneConnect(e), this.retryOptionsFor(e));
		} catch (t) {
			let n = t instanceof Error ? t.message : String(t), r = this.terminalEndReason ?? Jl(t);
			throw r && !this.disposed ? (this.finishTerminally(r, {
				source: "connect",
				error: n
			}), t) : (this.logger.error("realtime connect: exhausted all retries", { error: n }), this.currentAttempt === e && !this.disposed && this.setState("disconnected"), t);
		}
	}
	async sendPrompt(e, t) {
		this.assertConnected(), await this.signaling.sendPrompt(e, t), this.appliedState = {
			...this.getInitialState(),
			prompt: e,
			enhance: t?.enhance
		};
	}
	async setImage(e, t) {
		this.assertConnected(), await this.signaling.setImage(e, t), this.appliedState = e.kind === "ref" ? {
			imageRef: e.ref,
			prompt: t?.prompt ?? null,
			enhance: t?.enhance
		} : {
			image: e.data,
			prompt: t?.prompt ?? null,
			enhance: t?.enhance
		};
	}
	async replaceVideoTrack(e) {
		this.assertConnected(), await this.media.replaceVideoTrack(e);
		let t = this.config.localStream;
		this.config.localStream = new MediaStream(t ? [e, ...t.getAudioTracks()] : [e]);
	}
	disconnect() {
		this.disposed = !0, this.tearDown(), this.setState("disconnected");
	}
	assertConnected() {
		if (!this.isConnected()) throw Error(`Cannot send message: connection is ${this.state}`);
	}
	retryOptionsFor(e) {
		return {
			...Q.session.retry,
			onFailedAttempt: (e) => {
				this.tearDown();
			},
			shouldRetry: (t) => {
				if (this.disposed || this.currentAttempt !== e) return !1;
				let n = this.terminalEndReason ?? Jl(t);
				if (n) return this.terminalEndReason = n, this.logger.error("realtime connect: session refused, not retrying", { reason: n }), !1;
				let r = t.message.toLowerCase(), i = Q.session.permanentErrorSubstrings.some((e) => r.includes(e));
				return i && this.logger.error("realtime connect: permanent error, not retrying", { error: t.message }), !i;
			}
		};
	}
	async runOneConnect(e) {
		if (this.disposed || this.currentAttempt !== e) throw new Ul("Stale connect attempt");
		try {
			this.resetHandshakeState();
			let t = this.getInitialState();
			this.config.observability?.beginConnectionBreakdown(e, Xl(t?.image)), this.config.observability?.markGlassToGlassStart();
			let { roomInfo: n, initialStateAck: r } = await this.signaling.openAndJoin({
				connectTimeout: Q.session.connectionTimeoutMs,
				initialState: t,
				passthrough: this.config.initialPassthrough,
				frameTiming: this.config.frameTiming
			});
			if (this.watchInitialStateAck(r, e), this.disposed || this.currentAttempt !== e) throw this.tearDown(), new Ul("Stale connect attempt");
			this.queue = null;
			try {
				await this.media.connect({
					url: n.livekitUrl,
					token: n.token
				}), await this.media.publishLocalTracks();
			} catch (e) {
				throw this.tearDown(), e;
			}
			if (this.disposed || this.currentAttempt !== e) throw this.tearDown(), new Ul("Stale connect attempt");
			this.config.observability?.finishConnectionBreakdown({ success: !0 }), this.setState("connected"), this.events.emit("sessionStarted", {
				sessionId: n.sessionId,
				subscribeToken: Yl(n.roomName, { frameTiming: this.config.frameTiming })
			});
		} catch (e) {
			throw this.config.observability?.finishConnectionBreakdown({
				success: !1,
				error: e instanceof Error ? e.message : String(e)
			}), e;
		}
	}
	watchInitialStateAck(e, t) {
		let n = this.teardownGeneration;
		e.catch((e) => {
			this.disposed || this.currentAttempt !== t || this.teardownGeneration !== n || this.events.emit("error", e instanceof Error ? e : Error(String(e)));
		});
	}
	getInitialState() {
		return this.appliedState ?? this.configInitialState();
	}
	configInitialState() {
		if (this.config.initialImageRef !== void 0) return {
			imageRef: this.config.initialImageRef,
			prompt: this.config.initialPrompt?.text,
			enhance: this.config.initialPrompt?.enhance
		};
		if (this.config.initialImage !== void 0) return {
			image: this.config.initialImage,
			prompt: this.config.initialPrompt?.text,
			enhance: this.config.initialPrompt?.enhance
		};
		if (this.config.initialPrompt) return {
			prompt: this.config.initialPrompt.text,
			enhance: this.config.initialPrompt.enhance
		};
	}
	wireSignalingEvents() {
		this.signaling.on("queuePosition", (e) => {
			this.queue = e, this.events.emit("queuePosition", e);
		}), this.signaling.on("generationStarted", () => this.markGenerating()), this.signaling.on("generationTick", (e) => {
			this.markGenerating(), this.events.emit("generationTick", e);
		}), this.signaling.on("generationEnded", (e) => {
			Kl(e.reason) && (this.terminalEndReason = e.reason), this.events.emit("generationEnded", e);
		}), this.signaling.on("serverError", (e) => this.events.emit("error", e)), this.signaling.on("closed", (e) => {
			this.terminalEndReason ??= ql({ ...e }), this.handleConnectionLoss({
				source: "signaling",
				...e
			});
		});
	}
	markGenerating() {
		this.state === "connected" && this.setState("generating");
	}
	wireMediaEvents() {
		this.media.on("remoteStream", (e) => this.events.emit("remoteStream", e)), this.media.on("disconnected", (e) => this.handleConnectionLoss({
			source: "media",
			reason: e.reason
		}));
	}
	handleConnectionLoss(e) {
		if (this.disposed) return;
		let t = this.terminalEndReason ?? ql(e);
		if (t) {
			this.finishTerminally(t, e);
			return;
		}
		if (this.state !== "connected" && this.state !== "generating") {
			this.logger.debug("connection loss ignored (not connected)", {
				state: this.state,
				...e
			});
			return;
		}
		this.logger.warn("realtime connection lost; scheduling reconnect", {
			state: this.state,
			...e
		}), this.scheduleReconnect();
	}
	finishTerminally(e, t) {
		this.logger.warn("realtime session ended by the server; not reconnecting", {
			reason: e,
			state: this.state,
			...t
		}), this.terminalEndReason = e, this.disposed = !0, this.tearDown(), this.setState("disconnected"), this.events.emit("sessionEnded", { reason: e });
	}
	scheduleReconnect() {
		let e = ++this.currentAttempt;
		this.setState("reconnecting"), Gl(async () => {
			if (this.disposed || this.currentAttempt !== e) throw new Ul("Reconnect cancelled");
			this.tearDown(), this.createTransport(), await this.runOneConnect(e);
		}, this.retryOptionsFor(e)).then(() => {
			this.disposed || this.currentAttempt !== e || this.logger.info("realtime reconnect: succeeded");
		}).catch((t) => {
			if (this.disposed || this.currentAttempt !== e) return;
			let n = t instanceof Error ? t.message : String(t), r = this.terminalEndReason ?? Jl(t);
			if (r) {
				this.finishTerminally(r, {
					source: "reconnect",
					error: n
				});
				return;
			}
			this.logger.error("realtime reconnect: failed permanently", { error: n }), this.tearDown(), this.setState("disconnected"), this.events.emit("error", t instanceof Error ? t : Error(String(t)));
		});
	}
	createTransport() {
		this.signaling = new Fl({
			url: this.config.url,
			integration: this.config.integration,
			logger: this.logger,
			observability: this.config.observability
		}), this.media = this.config.createMediaChannel({
			observability: this.config.observability,
			localStream: this.config.localStream,
			logger: this.logger,
			videoCodec: this.config.videoCodec
		}), this.wireSignalingEvents(), this.wireMediaEvents();
	}
	tearDown() {
		this.teardownGeneration++, this.signaling.close(), this.media.disconnect(), this.resetHandshakeState();
	}
	resetHandshakeState() {
		this.queue = null;
	}
	setState(e) {
		this.state !== e && (this.logger.debug("realtime state change", {
			from: this.state,
			to: e
		}), this.state = e, this.events.emit("connectionChange", e));
	}
}, Ql = xl, $l = K({
	model: _l,
	onRemoteStream: kc((e) => typeof e == "function", { message: "onRemoteStream must be a function" }),
	onConnectionChange: kc((e) => typeof e == "function", { message: "onConnectionChange must be a function" }).optional(),
	onConnectionQuality: kc((e) => typeof e == "function", { message: "onConnectionQuality must be a function" }).optional(),
	onQueuePosition: kc((e) => typeof e == "function", { message: "onQueuePosition must be a function" }).optional(),
	initialState: Ql.optional(),
	queryParams: ac(H(), H()).optional(),
	mirror: q([Y("auto"), G()]).optional(),
	resolution: J(["720p", "1080p"]).optional(),
	speed: hl.optional(),
	preferredVideoCodec: J([
		"h264",
		"vp8",
		"vp9"
	]).optional(),
	debugQuality: G().optional()
}), eu = (e) => {
	let { baseUrl: t, apiKey: n, integration: r } = e, i = e.logger ?? S("info");
	return { connect: async (a, o) => {
		let s = $l.safeParse(o);
		if (!s.success) throw s.error;
		let { onRemoteStream: c, onConnectionChange: l, onConnectionQuality: u, onQueuePosition: d, initialState: p, resolution: m, speed: h, preferredVideoCodec: g } = s.data, _ = s.data.mirror ?? !1, v, y, b;
		try {
			let s = bl(p?.image) ? p.image : void 0, ee = s === void 0 && p?.image ? await Cl(p.image) : void 0, te = p?.prompt ? {
				text: p.prompt.text,
				enhance: p.prompt.enhance
			} : void 0, ne = `${t}${o.model.urlPath}`, { emitter: re, emitOrBuffer: x, flush: ie, stop: ae } = Tl();
			b = e.prepareConnection({
				stream: a,
				mirror: _,
				preferredVideoCodec: g,
				fps: gl(o.model.fps),
				logger: i,
				observability: {
					telemetryEnabled: e.telemetryEnabled,
					apiKey: n,
					model: o.model.name,
					integration: r,
					logger: i,
					onDiagnostic: (e) => x("diagnostic", e),
					onStats: (e) => x("stats", e),
					onConnectionQuality: (e) => {
						x("connectionQuality", e), u?.(e);
					}
				}
			}), y = b.observability, h && !o.model.supportedSpeeds?.includes(h) && i.warn("realtime: model does not support the requested speed tier; the server serves it at standard speed", {
				model: o.model.name,
				speed: h,
				supportedSpeeds: o.model.supportedSpeeds ?? []
			}), v = new Zl({
				url: `${ne}?${new URLSearchParams({
					...b.queryParams ?? {},
					...o.queryParams ?? {},
					api_key: n,
					model: o.model.name,
					...m ? { resolution: m } : {},
					...h ? { speed: h } : {}
				}).toString()}`,
				integration: r,
				observability: y,
				frameTiming: b.frameTiming,
				localStream: b.stream,
				initialImage: ee,
				initialImageRef: s,
				initialPrompt: te,
				initialPassthrough: p?.passthrough,
				logger: i,
				videoCodec: b.videoCodec,
				createMediaChannel: b.createMediaChannel
			});
			let oe = null, se = null;
			v.on("remoteStream", c), v.on("connectionChange", (e) => {
				x("connectionChange", e), l?.(e);
			}), v.on("queuePosition", (e) => {
				x("queuePosition", e), d?.(e);
			}), v.on("sessionStarted", ({ sessionId: e, subscribeToken: t }) => {
				oe = e, se = t, y?.sessionStarted(e);
			}), v.on("generationTick", (e) => x("generationTick", e)), v.on("generationEnded", (e) => x("generationEnded", e)), v.on("sessionEnded", (e) => x("sessionEnded", e)), v.on("error", (e) => {
				i.error("Realtime error", { error: e.message }), x("error", f(e));
			});
			let S = v;
			await S.connect();
			let ce = {
				...Nl(S, Cl),
				isConnected: () => S.isConnected(),
				getConnectionState: () => S.getConnectionState(),
				getConnectionQuality: () => y?.getConnectionQuality() ?? null,
				disconnect: () => {
					y?.stop(), ae(), S.disconnect(), b?.dispose();
				},
				on: re.on,
				off: re.off,
				get sessionId() {
					return oe;
				},
				get subscribeToken() {
					return se;
				},
				getSubscribeToken: () => se,
				setImage: async (e, t) => {
					if (bl(e)) return S.setImage({
						kind: "ref",
						ref: e
					}, t);
					if (e === null) return S.setImage({
						kind: "data",
						data: null
					}, t);
					let n = await Cl(e);
					return S.setImage({
						kind: "data",
						data: n
					}, t);
				}
			};
			return ie(), ce;
		} catch (e) {
			throw y?.stop(), v?.disconnect(), b?.dispose(), e;
		}
	} };
}, tu;
function nu(e) {
	let t = [
		typeof e.Room != "function" && "Room",
		(typeof e.RoomEvent != "object" || e.RoomEvent === null) && "RoomEvent",
		(e.Track === null || typeof e.Track != "object" && typeof e.Track != "function") && "Track",
		e.Track?.Source?.Camera !== "camera" && "Track.Source.Camera",
		(typeof e.ConnectionState != "object" || e.ConnectionState === null) && "ConnectionState"
	].filter((e) => e !== !1);
	if (t.length > 0) throw o(`livekit-client is missing or has invalid required exports: ${t.join(", ")}`);
	return e;
}
function ru() {
	return tu ??= import("./livekit-client.esm-B1iOzefr.mjs").then(nu).catch((e) => {
		if (tu = void 0, typeof e == "object" && e && "code" in e && e.code === "LIVEKIT_INITIALIZATION_ERROR") throw e;
		let t = e instanceof Error ? e : Error(String(e));
		throw o(`Failed to initialize livekit-client: ${t.message}`, t);
	}), tu;
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/observability/connection-quality.js
var iu = {
	critical: 0,
	poor: 1,
	fair: 2,
	good: 3
};
function au(...e) {
	return e.reduce((e, t) => iu[e] <= iu[t] ? e : t);
}
function $(e, t, n, r) {
	return e === null || e <= t ? "good" : e <= n ? "fair" : e <= r ? "poor" : "critical";
}
function ou(e, t, n, r) {
	return e === null || e >= t ? "good" : e >= n ? "fair" : e >= r ? "poor" : "critical";
}
function su(e) {
	let t = e.remoteInbound?.roundTripTime ?? e.connection.currentRoundTripTime, n = e.connection.selectedCandidatePairs.some((e) => e.local.candidateType === "relay" || e.remote.candidateType === "relay");
	return {
		rttMs: t == null ? null : t * 1e3,
		g2gMs: e.glassToGlass?.medianMs ?? null,
		ttffMs: e.glassToGlass?.ttffMs ?? null,
		upstreamJitterMs: e.remoteInbound?.jitter == null ? null : e.remoteInbound.jitter * 1e3,
		fractionLost: e.remoteInbound?.fractionLost == null ? null : e.remoteInbound.fractionLost / 256,
		g2gDropRatio: e.glassToGlass?.dropRatio ?? null,
		availableOutgoingKbps: e.connection.availableOutgoingBitrate == null ? null : e.connection.availableOutgoingBitrate / 1e3,
		fps: e.video?.framesPerSecond ?? null,
		freezeCountDelta: e.video?.freezeCountDelta ?? null,
		qualityLimitationReason: e.outboundVideo?.qualityLimitationReason ?? null,
		isRelayed: n
	};
}
function cu(e, t, n = {}) {
	let r = e.isRelayed ? t.rtt.relayExtraMs : 0, i = e.g2gMs == null ? $(e.rttMs, t.rtt.goodMs + r, t.rtt.fairMs + r, t.rtt.poorMs + r) : $(e.g2gMs, t.glassToGlass.goodMs, t.glassToGlass.fairMs, t.glassToGlass.poorMs), a = $(e.fractionLost, t.loss.good, t.loss.fair, t.loss.poor), o = "good";
	if (!n.skipBitrate) {
		let { goodKbps: n, fairKbps: r, poorKbps: i } = t.upstream;
		o = ou(e.availableOutgoingKbps, n, r, i), e.qualityLimitationReason === "bandwidth" && (o = au(o, "fair"));
	}
	let s = ou(e.fps, t.stall.goodFps, t.stall.fairFps, t.stall.poorFps);
	e.freezeCountDelta != null && e.freezeCountDelta > 0 && (s = au(s, "fair"));
	let c = $(e.g2gDropRatio, t.g2gDrop.good, t.g2gDrop.fair, t.g2gDrop.poor);
	s = au(s, c);
	let l = au(o, i, a, s), u;
	return u = l === "good" ? e.qualityLimitationReason === "cpu" ? "cpu" : "none" : o === l ? "bandwidth" : a === l ? "loss" : i === l ? "latency" : "stall", {
		quality: l,
		limitingFactor: u
	};
}
function lu(e) {
	if (e.length === 0) return null;
	let t = [...e].sort((e, t) => e - t), n = Math.floor(t.length / 2);
	return t.length % 2 == 0 ? (t[n - 1] + t[n]) / 2 : t[n];
}
function uu(e) {
	return e.length === 0 ? null : Math.min(...e);
}
var du = class {
	size;
	values = [];
	constructor(e) {
		this.size = e;
	}
	push(e) {
		e !== null && (this.values.push(e), this.values.length > this.size && this.values.shift());
	}
	median() {
		return lu(this.values);
	}
	min() {
		return uu(this.values);
	}
	clear() {
		this.values = [];
	}
}, fu = class {
	thresholds;
	rtt;
	glassToGlass;
	loss;
	availableOutgoing;
	fps;
	sampleCount = 0;
	currentLevel = null;
	currentFactor = "none";
	candidateLevel = null;
	candidateCount = 0;
	prevWarmingUp = !0;
	lastReport = null;
	constructor(e = Q.observability.connectionQuality) {
		this.thresholds = e;
		let t = e.windowSamples;
		this.rtt = new du(t), this.glassToGlass = new du(t), this.loss = new du(t), this.availableOutgoing = new du(t), this.fps = new du(t);
	}
	update(e) {
		this.sampleCount++;
		let t = su(e);
		this.rtt.push(t.rttMs), this.glassToGlass.push(t.g2gMs), this.loss.push(t.fractionLost), this.availableOutgoing.push(t.availableOutgoingKbps), this.fps.push(t.fps);
		let n = {
			...t,
			rttMs: this.rtt.median(),
			g2gMs: this.glassToGlass.median(),
			fractionLost: this.loss.median(),
			availableOutgoingKbps: this.availableOutgoing.median(),
			fps: this.fps.min()
		}, r = this.sampleCount < this.thresholds.warmupSamples, { quality: i, limitingFactor: a } = cu(n, this.thresholds, { skipBitrate: r }), o = this.prevWarmingUp && !r;
		this.prevWarmingUp = r;
		let s;
		o ? (s = this.currentLevel !== i, this.currentLevel = i, this.candidateLevel = null, this.candidateCount = 0) : s = this.applyHysteresis(i);
		let c = this.currentLevel ?? i;
		return c === "good" ? this.currentFactor = n.qualityLimitationReason === "cpu" ? "cpu" : "none" : iu[i] <= iu[c] && (this.currentFactor = a), this.lastReport = {
			quality: c,
			limitingFactor: this.currentFactor,
			warmingUp: r,
			metrics: {
				rttMs: n.rttMs,
				g2gMs: n.g2gMs,
				ttffMs: t.ttffMs,
				fps: n.fps,
				packetLoss: n.fractionLost,
				upstreamJitterMs: t.upstreamJitterMs,
				g2gDropRatio: t.g2gDropRatio,
				availableUpstreamKbps: n.availableOutgoingKbps
			}
		}, s || o ? this.lastReport : null;
	}
	current() {
		return this.lastReport;
	}
	reset() {
		this.rtt.clear(), this.glassToGlass.clear(), this.loss.clear(), this.availableOutgoing.clear(), this.fps.clear(), this.sampleCount = 0, this.currentLevel = null, this.currentFactor = "none", this.candidateLevel = null, this.candidateCount = 0, this.prevWarmingUp = !0, this.lastReport = null;
	}
	applyHysteresis(e) {
		if (this.currentLevel === null) return this.currentLevel = e, this.candidateLevel = null, this.candidateCount = 0, !0;
		if (e === this.currentLevel) return this.candidateLevel = null, this.candidateCount = 0, !1;
		e === this.candidateLevel ? this.candidateCount++ : (this.candidateLevel = e, this.candidateCount = 1);
		let t = iu[e] < iu[this.currentLevel] ? this.thresholds.downgradeConsecutive : this.thresholds.upgradeConsecutive;
		return this.candidateCount >= t && (this.currentLevel = e, this.candidateLevel = null, this.candidateCount = 0, !0);
	}
};
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/observability/livekit-stats-provider.js
function pu(e) {
	let t = 0, n = async (e, n) => {
		if (!e) return;
		let r;
		try {
			r = await e.getRTCStatsReport();
		} catch {
			return;
		}
		r && r.forEach((e, r) => {
			n.push([`${r}#${t++}`, e]);
		});
	};
	return { async getStats() {
		let t = [];
		for (let r of e.localParticipant.trackPublications.values()) await n(r.track, t);
		for (let r of e.remoteParticipants.values()) for (let e of r.trackPublications.values()) await n(e.track, t);
		return new Map(t);
	} };
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/observability/telemetry-reporter.js
var mu = 61440, hu = class {
	start() {}
	addStats() {}
	addDiagnostic() {}
	flush() {}
	stop() {}
}, gu = class {
	apiKey;
	sessionId;
	model;
	integration;
	reportIntervalMs;
	intervalId = null;
	statsBuffer = [];
	diagnosticsBuffer = [];
	constructor(e) {
		this.apiKey = e.apiKey, this.sessionId = e.sessionId, this.model = e.model, this.integration = e.integration, this.reportIntervalMs = e.reportIntervalMs ?? Q.observability.telemetryReportIntervalMs;
	}
	start() {
		this.intervalId === null && (this.intervalId = setInterval(() => this.flush(), this.reportIntervalMs));
	}
	addStats(e) {
		this.statsBuffer.push(e);
	}
	addDiagnostic(e) {
		this.diagnosticsBuffer.push(e);
	}
	flush() {
		this.sendReport();
	}
	stop() {
		this.intervalId !== null && (clearInterval(this.intervalId), this.intervalId = null), this.sendReport({ keepalive: !0 });
	}
	createReportChunk() {
		if (this.statsBuffer.length === 0 && this.diagnosticsBuffer.length === 0) return null;
		let e = {
			session_id: this.sessionId,
			sdk_version: Pc,
			...this.model ? { model: this.model } : {},
			...this.integration ? { integration: this.integration } : {}
		};
		return {
			sessionId: this.sessionId,
			timestamp: Date.now(),
			sdkVersion: Pc,
			...this.model ? { model: this.model } : {},
			tags: e,
			stats: this.statsBuffer.splice(0, Q.observability.telemetryMaxItemsPerReport),
			diagnostics: this.diagnosticsBuffer.splice(0, Q.observability.telemetryMaxItemsPerReport)
		};
	}
	sendReport(e = {}) {
		if (this.statsBuffer.length !== 0 || this.diagnosticsBuffer.length !== 0) try {
			let t = {
				...X({
					apiKey: this.apiKey,
					integration: this.integration
				}),
				"Content-Type": "application/json"
			}, n = [], r = this.createReportChunk();
			for (; r !== null;) n.push(r), r = this.createReportChunk();
			n.forEach((r, i) => {
				let a = JSON.stringify(r), o = e.keepalive && i === n.length - 1 && new TextEncoder().encode(a).byteLength <= mu;
				fetch(Q.observability.telemetryUrl, {
					method: "POST",
					headers: t,
					body: a,
					...o ? { keepalive: !0 } : {}
				}).catch(() => {});
			});
		} catch {}
	}
}, _u = class {
	source = null;
	intervalId = null;
	prevBytesVideo = 0;
	prevBytesAudio = 0;
	prevBytesSentVideo = 0;
	prevTimestamp = 0;
	prevPacketsLostVideo = 0;
	prevFramesDropped = 0;
	prevFreezeCount = 0;
	prevFreezeDuration = 0;
	prevPacketsLostAudio = 0;
	prevNackCountInbound = 0;
	onStats = null;
	intervalMs;
	constructor(e = {}) {
		this.intervalMs = Math.max(e.intervalMs ?? Q.observability.statsDefaultIntervalMs, Q.observability.statsMinIntervalMs);
	}
	start(e, t) {
		this.stop(), this.source = e, this.onStats = t, this.prevBytesVideo = 0, this.prevBytesAudio = 0, this.prevBytesSentVideo = 0, this.prevTimestamp = 0, this.prevPacketsLostVideo = 0, this.prevFramesDropped = 0, this.prevFreezeCount = 0, this.prevFreezeDuration = 0, this.prevPacketsLostAudio = 0, this.prevNackCountInbound = 0, this.intervalId = setInterval(() => this.collect(), this.intervalMs);
	}
	stop() {
		this.intervalId !== null && (clearInterval(this.intervalId), this.intervalId = null), this.source = null, this.onStats = null;
	}
	isRunning() {
		return this.intervalId !== null;
	}
	async collect() {
		if (this.source && this.onStats) try {
			let e = await this.source.getStats(), t = this.parse(e);
			this.onStats(t);
		} catch {
			this.stop();
		}
	}
	parse(e) {
		let t = performance.now(), n = this.prevTimestamp > 0 ? (t - this.prevTimestamp) / 1e3 : 0, r = null, i = null, a = null, o = null, s = {
			currentRoundTripTime: null,
			availableOutgoingBitrate: null,
			selectedCandidatePairs: []
		}, c = [];
		if (e.forEach((e) => {
			if (e.type === "inbound-rtp" && e.kind === "video") {
				let t = e.bytesReceived ?? 0, i = n > 0 ? (t - this.prevBytesVideo) * 8 / n : 0;
				this.prevBytesVideo = t;
				let a = e, o = a.packetsLost ?? 0, s = a.framesDropped ?? 0, c = a.freezeCount ?? 0, l = a.totalFreezesDuration ?? 0, u = a.framesDecoded ?? 0, d = a.nackCount ?? 0, f = a.jitterBufferEmittedCount ?? 0, p = a.totalDecodeTime ?? 0, m = a.totalProcessingDelay ?? 0, h = a.totalInterFrameDelay ?? 0, g = a.totalSquaredInterFrameDelay ?? 0, _ = a.jitterBufferDelay ?? 0, v = a.jitterBufferTargetDelay ?? 0, y = a.jitterBufferMinimumDelay ?? 0, b = u > 0 ? p / u * 1e3 : null, ee = u > 0 ? m / u * 1e3 : null, te = u > 0 ? h / u * 1e3 : null, ne = u > 0 ? Math.sqrt(Math.max(0, g / u - (h / u) ** 2)) * 1e3 : null, re = f > 0 ? _ / f * 1e3 : null, x = f > 0 ? v / f * 1e3 : null, ie = f > 0 ? y / f * 1e3 : null;
				r = {
					framesDecoded: u,
					framesDropped: s,
					framesReceived: a.framesReceived ?? 0,
					keyFramesDecoded: a.keyFramesDecoded ?? 0,
					framesPerSecond: a.framesPerSecond ?? 0,
					frameWidth: a.frameWidth ?? 0,
					frameHeight: a.frameHeight ?? 0,
					bytesReceived: t,
					packetsReceived: a.packetsReceived ?? 0,
					packetsLost: o,
					jitter: a.jitter ?? 0,
					bitrate: Math.round(i),
					freezeCount: c,
					totalFreezesDuration: l,
					packetsLostDelta: Math.max(0, o - this.prevPacketsLostVideo),
					framesDroppedDelta: Math.max(0, s - this.prevFramesDropped),
					freezeCountDelta: Math.max(0, c - this.prevFreezeCount),
					freezeDurationDelta: Math.max(0, l - this.prevFreezeDuration),
					nackCount: d,
					nackCountDelta: Math.max(0, d - this.prevNackCountInbound),
					pliCount: a.pliCount ?? 0,
					firCount: a.firCount ?? 0,
					avgDecodeTimeMs: b,
					avgJitterBufferMs: re,
					avgProcessingDelayMs: ee,
					avgInterFrameDelayMs: te,
					interFrameDelayStdDevMs: ne,
					jitterBufferTargetDelayMs: x,
					jitterBufferMinimumDelayMs: ie,
					decoderImplementation: a.decoderImplementation ?? ""
				}, this.prevPacketsLostVideo = o, this.prevFramesDropped = s, this.prevFreezeCount = c, this.prevFreezeDuration = l, this.prevNackCountInbound = d;
			}
			if (e.type === "outbound-rtp" && e.kind === "video") {
				let t = e, n = t.bytesSent ?? 0, r = t.packetsSent ?? 0, i = t.frameWidth ?? 0, o = t.frameHeight ?? 0, s = i * o, c = t.framesEncoded ?? 0, l = t.totalEncodeTime ?? 0, u = t.totalPacketSendDelay ?? 0, d = t.qpSum ?? 0, f = t.nackCount ?? 0, p = t.pliCount ?? 0, m = t.firCount ?? 0, h = t.retransmittedBytesSent ?? 0, g = t.retransmittedPacketsSent ?? 0, _ = t.targetBitrate ?? null, v = c > 0 ? l / c * 1e3 : null, y = r > 0 ? u / r * 1e3 : null, b = c > 0 ? d / c : null;
				a === null ? a = {
					qualityLimitationReason: t.qualityLimitationReason ?? "none",
					qualityLimitationDurations: t.qualityLimitationDurations ?? {},
					bytesSent: n,
					packetsSent: r,
					framesPerSecond: t.framesPerSecond ?? 0,
					frameWidth: i,
					frameHeight: o,
					bitrate: 0,
					targetBitrateKbps: _ == null ? null : Math.round(_ / 1e3),
					avgEncodeTimeMs: v,
					avgPacketSendDelayMs: y,
					avgQp: b,
					nackCount: f,
					pliCount: p,
					firCount: m,
					retransmittedBytesSent: h,
					retransmittedPacketsSent: g,
					encoderImplementation: t.encoderImplementation ?? ""
				} : (a.bytesSent += n, a.packetsSent += r, a.nackCount += f, a.pliCount += p, a.firCount += m, a.retransmittedBytesSent += h, a.retransmittedPacketsSent += g, s > a.frameWidth * a.frameHeight && (a.frameWidth = i, a.frameHeight = o, a.framesPerSecond = t.framesPerSecond ?? 0, a.qualityLimitationReason = t.qualityLimitationReason ?? "none", a.qualityLimitationDurations = t.qualityLimitationDurations ?? {}, a.targetBitrateKbps = _ == null ? null : Math.round(_ / 1e3), a.avgEncodeTimeMs = v, a.avgPacketSendDelayMs = y, a.avgQp = b, a.encoderImplementation = t.encoderImplementation ?? ""));
			}
			if (e.type === "remote-inbound-rtp" && e.kind === "video") {
				let t = e;
				o = {
					fractionLost: t.fractionLost ?? null,
					jitter: t.jitter ?? null,
					roundTripTime: t.roundTripTime ?? null
				};
			}
			if (e.type === "inbound-rtp" && e.kind === "audio") {
				let t = e.bytesReceived ?? 0, r = n > 0 ? (t - this.prevBytesAudio) * 8 / n : 0;
				this.prevBytesAudio = t;
				let a = e, o = a.packetsLost ?? 0;
				i = {
					bytesReceived: t,
					packetsReceived: a.packetsReceived ?? 0,
					packetsLost: o,
					jitter: a.jitter ?? 0,
					bitrate: Math.round(r),
					packetsLostDelta: Math.max(0, o - this.prevPacketsLostAudio)
				}, this.prevPacketsLostAudio = o;
			}
			if (e.type === "candidate-pair") {
				let t = e;
				if (t.state === "succeeded") {
					s.currentRoundTripTime = t.currentRoundTripTime ?? null, s.availableOutgoingBitrate = t.availableOutgoingBitrate ?? null;
					let e = t.localCandidateId, n = t.remoteCandidateId;
					e && n && c.push({
						localId: e,
						remoteId: n
					});
				}
			}
		}), c.length > 0) {
			let t = (t) => {
				let n = e.get(t);
				return n ? {
					candidateType: n.candidateType ?? "",
					address: n.address ?? n.ip ?? "",
					port: n.port ?? 0,
					protocol: n.protocol ?? ""
				} : null;
			};
			for (let { localId: e, remoteId: n } of c) {
				let r = t(e), i = t(n);
				r && i && s.selectedCandidatePairs.push({
					local: r,
					remote: i
				});
			}
		}
		let l = a;
		if (l !== null) {
			let e = n > 0 ? (l.bytesSent - this.prevBytesSentVideo) * 8 / n : 0;
			l.bitrate = Math.max(0, Math.round(e)), this.prevBytesSentVideo = l.bytesSent;
		}
		return this.prevTimestamp = t, {
			timestamp: Date.now(),
			video: r,
			audio: i,
			outboundVideo: a,
			connection: s,
			remoteInbound: o,
			glassToGlass: null
		};
	}
}, vu = class {
	options;
	telemetryReporter = new hu();
	telemetryReporterReady = !1;
	pendingTelemetryDiagnostics = [];
	statsCollector = null;
	statsCollectorSource = null;
	liveKitRoom = null;
	videoStalled = !1;
	stallStartMs = 0;
	connectionBreakdown = null;
	connectionQuality = new fu();
	glassToGlass;
	constructor(e) {
		this.options = e, this.glassToGlass = e.glassToGlass;
	}
	attachRemoteVideoTrack(e) {
		this.glassToGlass?.attachRemoteVideoTrack(e);
	}
	markGlassToGlassStart() {
		this.glassToGlass?.markStart();
	}
	diagnostic(e, t, n = Date.now()) {
		this.options.logger.debug(e, t), this.options.onDiagnostic?.({
			name: e,
			data: t
		}), this.addTelemetryDiagnostic(e, t, n);
	}
	beginConnectionBreakdown(e, t) {
		this.connectionBreakdown = {
			attempt: e,
			connectStartedAt: Date.now(),
			initialImageSizeKb: t,
			phases: /* @__PURE__ */ new Map()
		};
	}
	startPhase(e) {
		this.connectionBreakdown && this.connectionBreakdown.phases.set(e, { startedAt: Date.now() });
	}
	endPhase(e, t) {
		if (!this.connectionBreakdown) return;
		let n = this.connectionBreakdown.phases.get(e);
		if (!n) {
			this.options.logger.warn("observability: endPhase called for unknown phase", { phase: e });
			return;
		}
		n.endedAt = Date.now(), n.success = t.success, t.error !== void 0 && (n.error = t.error);
	}
	finishConnectionBreakdown(e) {
		let t = this.connectionBreakdown;
		if (!t) return;
		this.connectionBreakdown = null;
		let n = Date.now(), r = [];
		for (let [i, a] of t.phases) {
			let t = a.endedAt === void 0, o = a.endedAt ?? n, s = a.success ?? !1, c = a.error ?? (t && !e.success ? e.error : void 0);
			r.push({
				phase: i,
				durationMs: o - a.startedAt,
				success: s,
				...c === void 0 ? {} : { error: c }
			});
		}
		this.diagnostic("client-session-connection-breakdown", {
			attempt: t.attempt,
			success: e.success,
			totalDurationMs: n - t.connectStartedAt,
			initialImageSizeKb: t.initialImageSizeKb,
			phases: r,
			...e.error === void 0 ? {} : { error: e.error }
		}, n);
	}
	sessionStarted(e) {
		if (!this.options.telemetryEnabled) return;
		this.telemetryReporterReady && this.telemetryReporter.stop();
		let t = new gu({
			apiKey: this.options.apiKey,
			sessionId: e,
			model: this.options.model,
			integration: this.options.integration,
			logger: this.options.logger
		});
		t.start(), this.telemetryReporter = t, this.telemetryReporterReady = !0;
		for (let e of this.pendingTelemetryDiagnostics) this.telemetryReporter.addDiagnostic(e);
		this.pendingTelemetryDiagnostics.length = 0;
	}
	setStatsProvider(e) {
		if (!e) {
			this.stopStats();
			return;
		}
		e !== this.statsCollectorSource && (this.stopStats(), this.resetStallDetection(), this.statsCollectorSource = e, (this.options.telemetryEnabled || this.options.onStats || this.options.onConnectionQuality) && (this.statsCollector = new _u(), this.statsCollector.start(e, (e) => this.handleStats(e))));
	}
	setLiveKitRoom(e) {
		if (!e) {
			this.liveKitRoom = null, this.setStatsProvider(null);
			return;
		}
		e !== this.liveKitRoom && (this.setStatsProvider(pu(e)), this.liveKitRoom = e);
	}
	stopStats() {
		this.statsCollector?.stop(), this.statsCollector = null, this.statsCollectorSource = null, this.liveKitRoom = null, this.resetStallDetection();
	}
	stop() {
		this.stopStats(), this.glassToGlass?.dispose(), this.telemetryReporter.stop(), this.telemetryReporter = new hu(), this.telemetryReporterReady = !1, this.pendingTelemetryDiagnostics.length = 0, this.connectionBreakdown = null;
	}
	getConnectionQuality() {
		return this.connectionQuality.current();
	}
	handleStats(e) {
		this.glassToGlass && (e.glassToGlass = this.glassToGlass.snapshot()), this.options.onStats?.(e), this.telemetryReporter.addStats(e), this.detectVideoStall(e);
		let t = this.connectionQuality.update(e);
		t && this.options.onConnectionQuality?.(t);
	}
	detectVideoStall(e) {
		let t = e.video?.framesPerSecond ?? 0;
		if (!this.videoStalled && e.video && t < Q.observability.stallFpsThreshold) this.videoStalled = !0, this.stallStartMs = Date.now(), this.diagnostic("videoStall", {
			stalled: !0,
			durationMs: 0
		}, this.stallStartMs);
		else if (this.videoStalled && t >= Q.observability.stallFpsThreshold) {
			let e = Date.now() - this.stallStartMs;
			this.videoStalled = !1, this.diagnostic("videoStall", {
				stalled: !1,
				durationMs: e
			});
		}
	}
	addTelemetryDiagnostic(e, t, n) {
		if (!this.options.telemetryEnabled) return;
		let r = {
			name: e,
			data: t,
			timestamp: n
		};
		if (!this.telemetryReporterReady) {
			this.pendingTelemetryDiagnostics.push(r);
			return;
		}
		this.telemetryReporter.addDiagnostic(r);
	}
	resetStallDetection() {
		this.videoStalled = !1, this.stallStartMs = 0, this.connectionQuality.reset();
	}
};
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/subscribe-client.js
function yu(e) {
	return typeof e == "object" && !!e && typeof e.code == "string" && typeof e.message == "string";
}
function bu(e) {
	let t = e ? `: ${e}` : "";
	return r(n.UNSUPPORTED_PLATFORM_FEATURE, `This realtime stream requires LiveKit frame metadata, which this SDK environment does not support${t}.`, {
		feature: "LiveKit frame metadata subscribe",
		platform: "this SDK environment"
	});
}
function xu(e) {
	try {
		let t = JSON.parse(atob(e));
		if (!t.room_name || typeof t.room_name != "string") throw Error("Invalid subscribe token format");
		return {
			room_name: t.room_name,
			...t.frame_timing === !0 ? { frame_timing: !0 } : {}
		};
	} catch {
		throw Error("Invalid subscribe token");
	}
}
function Su(e) {
	switch (e) {
		case "connecting": return "connecting";
		case "connected": return "connected";
		case "reconnecting":
		case "signalReconnecting": return "reconnecting";
		case "disconnected": return "disconnected";
		default: return "disconnected";
	}
}
async function Cu(e) {
	if (!/^https?:\/\//i.test(e.baseUrl)) throw Error(`watch-stream baseUrl must use http(s); got ${e.baseUrl}`);
	let t = `${e.baseUrl}/watch-stream/${encodeURIComponent(e.roomName)}`, n = await fetch(t, {
		method: "POST",
		headers: {
			"x-api-key": e.apiKey,
			"content-type": "application/json"
		}
	});
	if (!n.ok) {
		let e = await n.text().catch(() => "");
		throw Error(`watch-stream request failed (${n.status}): ${e || n.statusText}`);
	}
	let r = await n.json();
	if (!r.livekit_url || !r.token || !r.room_name) throw Error("watch-stream response missing required fields");
	return {
		livekit_url: r.livekit_url,
		token: r.token,
		room_name: r.room_name
	};
}
var wu = (e) => {
	let { baseUrl: t, apiKey: n, integration: r } = e, i = e.logger ?? S("info");
	return { subscribe: async (a) => {
		let { room_name: o, frame_timing: s } = xu(a.token), { emitter: c, emitOrBuffer: l, flush: u, stop: d } = Tl(), p, m, h, g = "connecting", _ = null, v = (e) => {
			g !== e && (g = e, a.onConnectionChange?.(e), l("connectionChange", e));
		};
		try {
			let { Room: f, RoomEvent: g } = await ru();
			p = new vu({
				telemetryEnabled: !1,
				apiKey: n,
				integration: r,
				logger: i,
				onDiagnostic: (e) => l("diagnostic", e)
			}), v("connecting");
			let y = await Cu({
				baseUrl: t,
				apiKey: n,
				roomName: o
			});
			if (s) {
				if (!e.createFrameMetadataWorker) throw bu("this platform has no frame-metadata worker");
				if (!(e.isFrameMetadataRuntimeSupported?.() ?? !1)) throw bu("encoded transforms are unavailable or the SDK is served cross-origin");
				try {
					h = e.createFrameMetadataWorker();
				} catch (e) {
					throw bu(`failed to create the required worker (${e instanceof Error ? e.message : String(e)})`);
				}
			}
			try {
				m = new f({
					...Q.livekit.roomOptions,
					...h ? { frameMetadata: { worker: h } } : {}
				});
			} catch (e) {
				throw h?.terminate(), h = void 0, e;
			}
			let b = m;
			b.on(g.TrackSubscribed, (e, t, n) => {
				if (!n.identity.startsWith(Q.livekit.inferenceServerIdentityPrefix) || e.kind !== "video" && e.kind !== "audio") return;
				let r = e.mediaStreamTrack;
				if (!r) return;
				let i = _?.getTracks() ?? [];
				i.includes(r) || i.push(r), _ = new MediaStream(i), a.onRemoteStream(_);
			}), b.on(g.ConnectionStateChanged, (e) => {
				v(Su(e));
			}), b.on(g.Disconnected, () => {
				v("disconnected");
			}), await b.connect(y.livekit_url, y.token), p.setLiveKitRoom(b), v("connected");
			let ee = {
				isConnected: () => b.state === "connected",
				getConnectionState: () => Su(b.state),
				disconnect: () => {
					p?.stop(), d(), b.disconnect().catch(() => {});
				},
				on: c.on,
				off: c.off
			};
			return u(), ee;
		} catch (e) {
			if (p?.stop(), m && m.disconnect().catch(() => {}), h?.terminate(), yu(e)) throw i.error("Realtime subscribe error", { error: e.message }), e;
			let t = e instanceof Error ? e : Error(String(e));
			throw i.error("Realtime subscribe error", { error: t.message }), f(t);
		}
	} };
}, Tu = 300, Eu = 2e3, Du = 6e4, Ou = class {
	latencies = [];
	startMs = null;
	firstFrameMs = null;
	ttffMs = null;
	markStart(e) {
		this.reset(), this.startMs = e;
	}
	recordFrame(e, t) {
		if (e <= 0n) return;
		let n = t - Number(e) / 1e3;
		!Number.isFinite(n) || n < 0 || n > Du || (this.firstFrameMs === null && (this.firstFrameMs = t, this.startMs !== null && (this.ttffMs = Math.round(t - this.startMs))), !(t < this.firstFrameMs + Eu) && (this.latencies.push(n), this.latencies.length > Tu && this.latencies.shift()));
	}
	snapshot() {
		let e = [...this.latencies].sort((e, t) => e - t), t = e.length, n = t === 0 ? null : t % 2 == 0 ? Math.round((e[t / 2 - 1] + e[t / 2]) / 2) : Math.round(e[(t - 1) / 2]), r = t === 0 ? null : Math.round(e[Math.min(t - 1, Math.floor(.9 * t))]);
		return {
			ttffMs: this.ttffMs,
			medianMs: n,
			p90Ms: r,
			sampleCount: t,
			dropRatio: null
		};
	}
	reset() {
		this.latencies.length = 0, this.startMs = null, this.firstFrameMs = null, this.ttffMs = null;
	}
}, ku = "timeSyncUpdate";
function Au(e) {
	let t = null, n = ({ timestamp: n, rtpTimestamp: r }) => {
		let i = t?.lookupFrameMetadata?.({ rtpTimestamp: r });
		i && e.recordFrame(i.userTimestamp, n);
	}, r = () => {
		t?.off(ku, n), t = null;
	};
	return {
		attach: (e) => {
			e !== t && (r(), t = e, e.on(ku, n));
		},
		detach: r,
		dispose: r
	};
}
function ju() {
	let e = new Ou(), t = Au(e);
	return {
		attachRemoteVideoTrack: (e) => t.attach(e),
		markStart: () => {
			t.detach(), e.markStart(performance.timeOrigin + performance.now());
		},
		snapshot: () => e.snapshot(),
		dispose: () => t.dispose()
	};
}
var Mu = () => new URL("data:text/javascript;base64,IWZ1bmN0aW9uKGUpeyJmdW5jdGlvbiI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGUpOmUoKX0oKGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIGUoZSx0KXtpZighZSl0aHJvdyBuZXcgRXJyb3IodCl9ZnVuY3Rpb24gdChlKXtpZigibnVtYmVyIiE9dHlwZW9mIGUpdGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGludCAzMjogIit0eXBlb2YgZSk7aWYoIU51bWJlci5pc0ludGVnZXIoZSl8fGU+MjE0NzQ4MzY0N3x8ZTwtMjE0NzQ4MzY0OCl0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgaW50IDMyOiAiK2UpfWZ1bmN0aW9uIG4oZSl7aWYoIm51bWJlciIhPXR5cGVvZiBlKXRocm93IG5ldyBFcnJvcigiaW52YWxpZCB1aW50IDMyOiAiK3R5cGVvZiBlKTtpZighTnVtYmVyLmlzSW50ZWdlcihlKXx8ZT40Mjk0OTY3Mjk1fHxlPDApdGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIHVpbnQgMzI6ICIrZSl9ZnVuY3Rpb24gcihlKXtpZigibnVtYmVyIiE9dHlwZW9mIGUpdGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGZsb2F0IDMyOiAiK3R5cGVvZiBlKTtpZihOdW1iZXIuaXNGaW5pdGUoZSkmJihlPjM0MDI4MjM0NjYzODUyODg2ZTIyfHxlPC0zNDAyODIzNDY2Mzg1Mjg4NmUyMikpdGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGZsb2F0IDMyOiAiK2UpfWNvbnN0IGk9U3ltYm9sKCJAYnVmYnVpbGQvcHJvdG9idWYvZW51bS10eXBlIik7ZnVuY3Rpb24gYSh0KXtjb25zdCBuPXRbaV07cmV0dXJuIGUobiwibWlzc2luZyBlbnVtIHR5cGUgb24gZW51bSBvYmplY3QiKSxufWZ1bmN0aW9uIG8oZSx0LG4scil7ZVtpXT1zKHQsbi5tYXAoKHQ9Pih7bm86dC5ubyxuYW1lOnQubmFtZSxsb2NhbE5hbWU6ZVt0Lm5vXX0pKSkpfWZ1bmN0aW9uIHMoZSx0LG4pe2NvbnN0IHI9T2JqZWN0LmNyZWF0ZShudWxsKSxpPU9iamVjdC5jcmVhdGUobnVsbCksYT1bXTtmb3IoY29uc3QgZSBvZiB0KXtjb25zdCB0PXUoZSk7YS5wdXNoKHQpLHJbZS5uYW1lXT10LGlbZS5ub109dH1yZXR1cm57dHlwZU5hbWU6ZSx2YWx1ZXM6YSxmaW5kTmFtZTplPT5yW2VdLGZpbmROdW1iZXI6ZT0+aVtlXX19ZnVuY3Rpb24gYyhlLHQsbil7Y29uc3Qgcj17fTtmb3IoY29uc3QgZSBvZiB0KXtjb25zdCB0PXUoZSk7clt0LmxvY2FsTmFtZV09dC5ubyxyW3Qubm9dPXQubG9jYWxOYW1lfXJldHVybiBvKHIsZSx0KSxyfWZ1bmN0aW9uIHUoZSl7cmV0dXJuImxvY2FsTmFtZSJpbiBlP2U6T2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LGUpLHtsb2NhbE5hbWU6ZS5uYW1lfSl9Y2xhc3MgbHtlcXVhbHMoZSl7cmV0dXJuIHRoaXMuZ2V0VHlwZSgpLnJ1bnRpbWUudXRpbC5lcXVhbHModGhpcy5nZXRUeXBlKCksdGhpcyxlKX1jbG9uZSgpe3JldHVybiB0aGlzLmdldFR5cGUoKS5ydW50aW1lLnV0aWwuY2xvbmUodGhpcyl9ZnJvbUJpbmFyeShlLHQpe2NvbnN0IG49dGhpcy5nZXRUeXBlKCkucnVudGltZS5iaW4scj1uLm1ha2VSZWFkT3B0aW9ucyh0KTtyZXR1cm4gbi5yZWFkTWVzc2FnZSh0aGlzLHIucmVhZGVyRmFjdG9yeShlKSxlLmJ5dGVMZW5ndGgsciksdGhpc31mcm9tSnNvbihlLHQpe2NvbnN0IG49dGhpcy5nZXRUeXBlKCkscj1uLnJ1bnRpbWUuanNvbixpPXIubWFrZVJlYWRPcHRpb25zKHQpO3JldHVybiByLnJlYWRNZXNzYWdlKG4sZSxpLHRoaXMpLHRoaXN9ZnJvbUpzb25TdHJpbmcoZSx0KXtsZXQgbjt0cnl7bj1KU09OLnBhcnNlKGUpfWNhdGNoKGUpe3Rocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSAiLmNvbmNhdCh0aGlzLmdldFR5cGUoKS50eXBlTmFtZSwiIGZyb20gSlNPTjogIikuY29uY2F0KGUgaW5zdGFuY2VvZiBFcnJvcj9lLm1lc3NhZ2U6U3RyaW5nKGUpKSl9cmV0dXJuIHRoaXMuZnJvbUpzb24obix0KX10b0JpbmFyeShlKXtjb25zdCB0PXRoaXMuZ2V0VHlwZSgpLnJ1bnRpbWUuYmluLG49dC5tYWtlV3JpdGVPcHRpb25zKGUpLHI9bi53cml0ZXJGYWN0b3J5KCk7cmV0dXJuIHQud3JpdGVNZXNzYWdlKHRoaXMscixuKSxyLmZpbmlzaCgpfXRvSnNvbihlKXtjb25zdCB0PXRoaXMuZ2V0VHlwZSgpLnJ1bnRpbWUuanNvbixuPXQubWFrZVdyaXRlT3B0aW9ucyhlKTtyZXR1cm4gdC53cml0ZU1lc3NhZ2UodGhpcyxuKX10b0pzb25TdHJpbmcoZSl7dmFyIHQ7Y29uc3Qgbj10aGlzLnRvSnNvbihlKTtyZXR1cm4gSlNPTi5zdHJpbmdpZnkobixudWxsLG51bGwhPT0odD1udWxsPT1lP3ZvaWQgMDplLnByZXR0eVNwYWNlcykmJnZvaWQgMCE9PXQ/dDowKX10b0pTT04oKXtyZXR1cm4gdGhpcy50b0pzb24oe2VtaXREZWZhdWx0VmFsdWVzOiEwfSl9Z2V0VHlwZSgpe3JldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGhpcykuY29uc3RydWN0b3J9fWZ1bmN0aW9uIGQoKXtsZXQgZT0wLHQ9MDtmb3IobGV0IG49MDtuPDI4O24rPTcpe2xldCByPXRoaXMuYnVmW3RoaXMucG9zKytdO2lmKGV8PSgxMjcmcik8PG4sISgxMjgmcikpcmV0dXJuIHRoaXMuYXNzZXJ0Qm91bmRzKCksW2UsdF19bGV0IG49dGhpcy5idWZbdGhpcy5wb3MrK107aWYoZXw9KDE1Jm4pPDwyOCx0PSgxMTImbik+PjQsISgxMjgmbikpcmV0dXJuIHRoaXMuYXNzZXJ0Qm91bmRzKCksW2UsdF07Zm9yKGxldCBuPTM7bjw9MzE7bis9Nyl7bGV0IHI9dGhpcy5idWZbdGhpcy5wb3MrK107aWYodHw9KDEyNyZyKTw8biwhKDEyOCZyKSlyZXR1cm4gdGhpcy5hc3NlcnRCb3VuZHMoKSxbZSx0XX10aHJvdyBuZXcgRXJyb3IoImludmFsaWQgdmFyaW50Iil9ZnVuY3Rpb24gZihlLHQsbil7Zm9yKGxldCByPTA7cjwyODtyKz03KXtjb25zdCBpPWU+Pj5yLGE9IShpPj4+Nz09MCYmMD09dCksbz0yNTUmKGE/MTI4fGk6aSk7aWYobi5wdXNoKG8pLCFhKXJldHVybn1jb25zdCByPWU+Pj4yOCYxNXwoNyZ0KTw8NCxpPSEhKHQ+PjMpO2lmKG4ucHVzaCgyNTUmKGk/MTI4fHI6cikpLGkpe2ZvcihsZXQgZT0zO2U8MzE7ZSs9Nyl7Y29uc3Qgcj10Pj4+ZSxpPSEocj4+Pjc9PTApLGE9MjU1JihpPzEyOHxyOnIpO2lmKG4ucHVzaChhKSwhaSlyZXR1cm59bi5wdXNoKHQ+Pj4zMSYxKX19Y29uc3QgaD00Mjk0OTY3Mjk2O2Z1bmN0aW9uIHAoZSl7Y29uc3QgdD0iLSI9PT1lWzBdO3QmJihlPWUuc2xpY2UoMSkpO2NvbnN0IG49MWU2O2xldCByPTAsaT0wO2Z1bmN0aW9uIGEodCxhKXtjb25zdCBvPU51bWJlcihlLnNsaWNlKHQsYSkpO2kqPW4scj1yKm4rbyxyPj1oJiYoaSs9ci9ofDAsciU9aCl9cmV0dXJuIGEoLTI0LC0xOCksYSgtMTgsLTEyKSxhKC0xMiwtNiksYSgtNiksdD9iKHIsaSk6ZyhyLGkpfWZ1bmN0aW9uIG0oZSx0KXt2YXIgbj1mdW5jdGlvbihlLHQpe3JldHVybntsbzplPj4+MCxoaTp0Pj4+MH19KGUsdCk7aWYoZT1uLmxvLCh0PW4uaGkpPD0yMDk3MTUxKXJldHVybiBTdHJpbmcoaCp0K2UpO2NvbnN0IHI9MTY3NzcyMTUmKGU+Pj4yNHx0PDw4KSxpPXQ+PjE2JjY1NTM1O2xldCBhPSgxNjc3NzIxNSZlKSs2Nzc3MjE2KnIrNjcxMDY1NippLG89cis4MTQ3NDk3Kmkscz0yKmk7Y29uc3QgYz0xZTc7cmV0dXJuIGE+PWMmJihvKz1NYXRoLmZsb29yKGEvYyksYSU9Yyksbz49YyYmKHMrPU1hdGguZmxvb3Ioby9jKSxvJT1jKSxzLnRvU3RyaW5nKCkreShvKSt5KGEpfWZ1bmN0aW9uIGcoZSx0KXtyZXR1cm57bG86MHxlLGhpOjB8dH19ZnVuY3Rpb24gYihlLHQpe3JldHVybiB0PX50LGU/ZT0xK35lOnQrPTEsZyhlLHQpfWNvbnN0IHk9ZT0+e2NvbnN0IHQ9U3RyaW5nKGUpO3JldHVybiIwMDAwMDAwIi5zbGljZSh0Lmxlbmd0aCkrdH07ZnVuY3Rpb24gdihlLHQpe2lmKGU+PTApe2Zvcig7ZT4xMjc7KXQucHVzaCgxMjcmZXwxMjgpLGU+Pj49Nzt0LnB1c2goZSl9ZWxzZXtmb3IobGV0IG49MDtuPDk7bisrKXQucHVzaCgxMjcmZXwxMjgpLGU+Pj03O3QucHVzaCgxKX19ZnVuY3Rpb24gaygpe2xldCBlPXRoaXMuYnVmW3RoaXMucG9zKytdLHQ9MTI3JmU7aWYoISgxMjgmZSkpcmV0dXJuIHRoaXMuYXNzZXJ0Qm91bmRzKCksdDtpZihlPXRoaXMuYnVmW3RoaXMucG9zKytdLHR8PSgxMjcmZSk8PDcsISgxMjgmZSkpcmV0dXJuIHRoaXMuYXNzZXJ0Qm91bmRzKCksdDtpZihlPXRoaXMuYnVmW3RoaXMucG9zKytdLHR8PSgxMjcmZSk8PDE0LCEoMTI4JmUpKXJldHVybiB0aGlzLmFzc2VydEJvdW5kcygpLHQ7aWYoZT10aGlzLmJ1Zlt0aGlzLnBvcysrXSx0fD0oMTI3JmUpPDwyMSwhKDEyOCZlKSlyZXR1cm4gdGhpcy5hc3NlcnRCb3VuZHMoKSx0O2U9dGhpcy5idWZbdGhpcy5wb3MrK10sdHw9KDE1JmUpPDwyODtmb3IobGV0IHQ9NTsxMjgmZSYmdDwxMDt0KyspZT10aGlzLmJ1Zlt0aGlzLnBvcysrXTtpZigxMjgmZSl0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgdmFyaW50Iik7cmV0dXJuIHRoaXMuYXNzZXJ0Qm91bmRzKCksdD4+PjB9Y29uc3Qgdz1mdW5jdGlvbigpe2NvbnN0IHQ9bmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcig4KSk7aWYoImZ1bmN0aW9uIj09dHlwZW9mIEJpZ0ludCYmImZ1bmN0aW9uIj09dHlwZW9mIHQuZ2V0QmlnSW50NjQmJiJmdW5jdGlvbiI9PXR5cGVvZiB0LmdldEJpZ1VpbnQ2NCYmImZ1bmN0aW9uIj09dHlwZW9mIHQuc2V0QmlnSW50NjQmJiJmdW5jdGlvbiI9PXR5cGVvZiB0LnNldEJpZ1VpbnQ2NCYmKCJvYmplY3QiIT10eXBlb2YgcHJvY2Vzc3x8Im9iamVjdCIhPXR5cGVvZiBwcm9jZXNzLmVudnx8IjEiIT09cHJvY2Vzcy5lbnYuQlVGX0JJR0lOVF9ESVNBQkxFKSl7Y29uc3QgZT1CaWdJbnQoIi05MjIzMzcyMDM2ODU0Nzc1ODA4Iiksbj1CaWdJbnQoIjkyMjMzNzIwMzY4NTQ3NzU4MDciKSxyPUJpZ0ludCgiMCIpLGk9QmlnSW50KCIxODQ0Njc0NDA3MzcwOTU1MTYxNSIpO3JldHVybnt6ZXJvOkJpZ0ludCgwKSxzdXBwb3J0ZWQ6ITAscGFyc2UodCl7Y29uc3Qgcj0iYmlnaW50Ij09dHlwZW9mIHQ/dDpCaWdJbnQodCk7aWYocj5ufHxyPGUpdGhyb3cgbmV3IEVycm9yKCJpbnQ2NCBpbnZhbGlkOiAiLmNvbmNhdCh0KSk7cmV0dXJuIHJ9LHVQYXJzZShlKXtjb25zdCB0PSJiaWdpbnQiPT10eXBlb2YgZT9lOkJpZ0ludChlKTtpZih0Pml8fHQ8cil0aHJvdyBuZXcgRXJyb3IoInVpbnQ2NCBpbnZhbGlkOiAiLmNvbmNhdChlKSk7cmV0dXJuIHR9LGVuYyhlKXtyZXR1cm4gdC5zZXRCaWdJbnQ2NCgwLHRoaXMucGFyc2UoZSksITApLHtsbzp0LmdldEludDMyKDAsITApLGhpOnQuZ2V0SW50MzIoNCwhMCl9fSx1RW5jKGUpe3JldHVybiB0LnNldEJpZ0ludDY0KDAsdGhpcy51UGFyc2UoZSksITApLHtsbzp0LmdldEludDMyKDAsITApLGhpOnQuZ2V0SW50MzIoNCwhMCl9fSxkZWM6KGUsbik9Pih0LnNldEludDMyKDAsZSwhMCksdC5zZXRJbnQzMig0LG4sITApLHQuZ2V0QmlnSW50NjQoMCwhMCkpLHVEZWM6KGUsbik9Pih0LnNldEludDMyKDAsZSwhMCksdC5zZXRJbnQzMig0LG4sITApLHQuZ2V0QmlnVWludDY0KDAsITApKX19Y29uc3Qgbj10PT5lKC9eLT9bMC05XSskLy50ZXN0KHQpLCJpbnQ2NCBpbnZhbGlkOiAiLmNvbmNhdCh0KSkscj10PT5lKC9eWzAtOV0rJC8udGVzdCh0KSwidWludDY0IGludmFsaWQ6ICIuY29uY2F0KHQpKTtyZXR1cm57emVybzoiMCIsc3VwcG9ydGVkOiExLHBhcnNlOmU9Pigic3RyaW5nIiE9dHlwZW9mIGUmJihlPWUudG9TdHJpbmcoKSksbihlKSxlKSx1UGFyc2U6ZT0+KCJzdHJpbmciIT10eXBlb2YgZSYmKGU9ZS50b1N0cmluZygpKSxyKGUpLGUpLGVuYzplPT4oInN0cmluZyIhPXR5cGVvZiBlJiYoZT1lLnRvU3RyaW5nKCkpLG4oZSkscChlKSksdUVuYzplPT4oInN0cmluZyIhPXR5cGVvZiBlJiYoZT1lLnRvU3RyaW5nKCkpLHIoZSkscChlKSksZGVjOihlLHQpPT5mdW5jdGlvbihlLHQpe2xldCBuPWcoZSx0KTtjb25zdCByPTIxNDc0ODM2NDgmbi5oaTtyJiYobj1iKG4ubG8sbi5oaSkpO2NvbnN0IGk9bShuLmxvLG4uaGkpO3JldHVybiByPyItIitpOml9KGUsdCksdURlYzooZSx0KT0+bShlLHQpfX0oKTt2YXIgVCxTLEU7ZnVuY3Rpb24gTihlLHQsbil7aWYodD09PW4pcmV0dXJuITA7aWYoZT09VC5CWVRFUyl7aWYoISh0IGluc3RhbmNlb2YgVWludDhBcnJheSYmbiBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpKXJldHVybiExO2lmKHQubGVuZ3RoIT09bi5sZW5ndGgpcmV0dXJuITE7Zm9yKGxldCBlPTA7ZTx0Lmxlbmd0aDtlKyspaWYodFtlXSE9PW5bZV0pcmV0dXJuITE7cmV0dXJuITB9c3dpdGNoKGUpe2Nhc2UgVC5VSU5UNjQ6Y2FzZSBULkZJWEVENjQ6Y2FzZSBULklOVDY0OmNhc2UgVC5TRklYRUQ2NDpjYXNlIFQuU0lOVDY0OnJldHVybiB0PT1ufXJldHVybiExfWZ1bmN0aW9uIEkoZSx0KXtzd2l0Y2goZSl7Y2FzZSBULkJPT0w6cmV0dXJuITE7Y2FzZSBULlVJTlQ2NDpjYXNlIFQuRklYRUQ2NDpjYXNlIFQuSU5UNjQ6Y2FzZSBULlNGSVhFRDY0OmNhc2UgVC5TSU5UNjQ6cmV0dXJuIDA9PXQ/dy56ZXJvOiIwIjtjYXNlIFQuRE9VQkxFOmNhc2UgVC5GTE9BVDpyZXR1cm4gMDtjYXNlIFQuQllURVM6cmV0dXJuIG5ldyBVaW50OEFycmF5KDApO2Nhc2UgVC5TVFJJTkc6cmV0dXJuIiI7ZGVmYXVsdDpyZXR1cm4gMH19ZnVuY3Rpb24gTyhlLHQpe3N3aXRjaChlKXtjYXNlIFQuQk9PTDpyZXR1cm4hMT09PXQ7Y2FzZSBULlNUUklORzpyZXR1cm4iIj09PXQ7Y2FzZSBULkJZVEVTOnJldHVybiB0IGluc3RhbmNlb2YgVWludDhBcnJheSYmIXQuYnl0ZUxlbmd0aDtkZWZhdWx0OnJldHVybiAwPT10fX1mdW5jdGlvbiBDKGUsdCl7KG51bGw9PXR8fHQ+ZS5sZW5ndGgpJiYodD1lLmxlbmd0aCk7Zm9yKHZhciBuPTAscj1BcnJheSh0KTtuPHQ7bisrKXJbbl09ZVtuXTtyZXR1cm4gcn1mdW5jdGlvbiBBKGUsdCl7cmV0dXJuIGZ1bmN0aW9uKGUpe2lmKEFycmF5LmlzQXJyYXkoZSkpcmV0dXJuIGV9KGUpfHxmdW5jdGlvbihlLHQpe3ZhciBuPW51bGw9PWU/bnVsbDoidW5kZWZpbmVkIiE9dHlwZW9mIFN5bWJvbCYmZVtTeW1ib2wuaXRlcmF0b3JdfHxlWyJAQGl0ZXJhdG9yIl07aWYobnVsbCE9bil7dmFyIHIsaSxhLG8scz1bXSxjPSEwLHU9ITE7dHJ5e2lmKGE9KG49bi5jYWxsKGUpKS5uZXh0LDA9PT10KXtpZihPYmplY3QobikhPT1uKXJldHVybjtjPSExfWVsc2UgZm9yKDshKGM9KHI9YS5jYWxsKG4pKS5kb25lKSYmKHMucHVzaChyLnZhbHVlKSxzLmxlbmd0aCE9PXQpO2M9ITApO31jYXRjaChlKXt1PSEwLGk9ZX1maW5hbGx5e3RyeXtpZighYyYmbnVsbCE9bi5yZXR1cm4mJihvPW4ucmV0dXJuKCksT2JqZWN0KG8pIT09bykpcmV0dXJufWZpbmFsbHl7aWYodSl0aHJvdyBpfX1yZXR1cm4gc319KGUsdCl8fGZ1bmN0aW9uKGUsdCl7aWYoZSl7aWYoInN0cmluZyI9PXR5cGVvZiBlKXJldHVybiBDKGUsdCk7dmFyIG49e30udG9TdHJpbmcuY2FsbChlKS5zbGljZSg4LC0xKTtyZXR1cm4iT2JqZWN0Ij09PW4mJmUuY29uc3RydWN0b3ImJihuPWUuY29uc3RydWN0b3IubmFtZSksIk1hcCI9PT1ufHwiU2V0Ij09PW4/QXJyYXkuZnJvbShlKToiQXJndW1lbnRzIj09PW58fC9eKD86VWl8SSludCg/Ojh8MTZ8MzIpKD86Q2xhbXBlZCk/QXJyYXkkLy50ZXN0KG4pP0MoZSx0KTp2b2lkIDB9fShlLHQpfHxmdW5jdGlvbigpe3Rocm93IG5ldyBUeXBlRXJyb3IoIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2UuXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuIil9KCl9IWZ1bmN0aW9uKGUpe2VbZS5ET1VCTEU9MV09IkRPVUJMRSIsZVtlLkZMT0FUPTJdPSJGTE9BVCIsZVtlLklOVDY0PTNdPSJJTlQ2NCIsZVtlLlVJTlQ2ND00XT0iVUlOVDY0IixlW2UuSU5UMzI9NV09IklOVDMyIixlW2UuRklYRUQ2ND02XT0iRklYRUQ2NCIsZVtlLkZJWEVEMzI9N109IkZJWEVEMzIiLGVbZS5CT09MPThdPSJCT09MIixlW2UuU1RSSU5HPTldPSJTVFJJTkciLGVbZS5CWVRFUz0xMl09IkJZVEVTIixlW2UuVUlOVDMyPTEzXT0iVUlOVDMyIixlW2UuU0ZJWEVEMzI9MTVdPSJTRklYRUQzMiIsZVtlLlNGSVhFRDY0PTE2XT0iU0ZJWEVENjQiLGVbZS5TSU5UMzI9MTddPSJTSU5UMzIiLGVbZS5TSU5UNjQ9MThdPSJTSU5UNjQifShUfHwoVD17fSkpLGZ1bmN0aW9uKGUpe2VbZS5CSUdJTlQ9MF09IkJJR0lOVCIsZVtlLlNUUklORz0xXT0iU1RSSU5HIn0oU3x8KFM9e30pKSxmdW5jdGlvbihlKXtlW2UuVmFyaW50PTBdPSJWYXJpbnQiLGVbZS5CaXQ2ND0xXT0iQml0NjQiLGVbZS5MZW5ndGhEZWxpbWl0ZWQ9Ml09Ikxlbmd0aERlbGltaXRlZCIsZVtlLlN0YXJ0R3JvdXA9M109IlN0YXJ0R3JvdXAiLGVbZS5FbmRHcm91cD00XT0iRW5kR3JvdXAiLGVbZS5CaXQzMj01XT0iQml0MzIifShFfHwoRT17fSkpO2NsYXNzIFV7Y29uc3RydWN0b3IoZSl7dGhpcy5zdGFjaz1bXSx0aGlzLnRleHRFbmNvZGVyPW51bGwhPWU/ZTpuZXcgVGV4dEVuY29kZXIsdGhpcy5jaHVua3M9W10sdGhpcy5idWY9W119ZmluaXNoKCl7dGhpcy5jaHVua3MucHVzaChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZikpO2xldCBlPTA7Zm9yKGxldCB0PTA7dDx0aGlzLmNodW5rcy5sZW5ndGg7dCsrKWUrPXRoaXMuY2h1bmtzW3RdLmxlbmd0aDtsZXQgdD1uZXcgVWludDhBcnJheShlKSxuPTA7Zm9yKGxldCBlPTA7ZTx0aGlzLmNodW5rcy5sZW5ndGg7ZSsrKXQuc2V0KHRoaXMuY2h1bmtzW2VdLG4pLG4rPXRoaXMuY2h1bmtzW2VdLmxlbmd0aDtyZXR1cm4gdGhpcy5jaHVua3M9W10sdH1mb3JrKCl7cmV0dXJuIHRoaXMuc3RhY2sucHVzaCh7Y2h1bmtzOnRoaXMuY2h1bmtzLGJ1Zjp0aGlzLmJ1Zn0pLHRoaXMuY2h1bmtzPVtdLHRoaXMuYnVmPVtdLHRoaXN9am9pbigpe2xldCBlPXRoaXMuZmluaXNoKCksdD10aGlzLnN0YWNrLnBvcCgpO2lmKCF0KXRocm93IG5ldyBFcnJvcigiaW52YWxpZCBzdGF0ZSwgZm9yayBzdGFjayBlbXB0eSIpO3JldHVybiB0aGlzLmNodW5rcz10LmNodW5rcyx0aGlzLmJ1Zj10LmJ1Zix0aGlzLnVpbnQzMihlLmJ5dGVMZW5ndGgpLHRoaXMucmF3KGUpfXRhZyhlLHQpe3JldHVybiB0aGlzLnVpbnQzMigoZTw8M3x0KT4+PjApfXJhdyhlKXtyZXR1cm4gdGhpcy5idWYubGVuZ3RoJiYodGhpcy5jaHVua3MucHVzaChuZXcgVWludDhBcnJheSh0aGlzLmJ1ZikpLHRoaXMuYnVmPVtdKSx0aGlzLmNodW5rcy5wdXNoKGUpLHRoaXN9dWludDMyKGUpe2ZvcihuKGUpO2U+MTI3Oyl0aGlzLmJ1Zi5wdXNoKDEyNyZlfDEyOCksZT4+Pj03O3JldHVybiB0aGlzLmJ1Zi5wdXNoKGUpLHRoaXN9aW50MzIoZSl7cmV0dXJuIHQoZSksdihlLHRoaXMuYnVmKSx0aGlzfWJvb2woZSl7cmV0dXJuIHRoaXMuYnVmLnB1c2goZT8xOjApLHRoaXN9Ynl0ZXMoZSl7cmV0dXJuIHRoaXMudWludDMyKGUuYnl0ZUxlbmd0aCksdGhpcy5yYXcoZSl9c3RyaW5nKGUpe2xldCB0PXRoaXMudGV4dEVuY29kZXIuZW5jb2RlKGUpO3JldHVybiB0aGlzLnVpbnQzMih0LmJ5dGVMZW5ndGgpLHRoaXMucmF3KHQpfWZsb2F0KGUpe3IoZSk7bGV0IHQ9bmV3IFVpbnQ4QXJyYXkoNCk7cmV0dXJuIG5ldyBEYXRhVmlldyh0LmJ1ZmZlcikuc2V0RmxvYXQzMigwLGUsITApLHRoaXMucmF3KHQpfWRvdWJsZShlKXtsZXQgdD1uZXcgVWludDhBcnJheSg4KTtyZXR1cm4gbmV3IERhdGFWaWV3KHQuYnVmZmVyKS5zZXRGbG9hdDY0KDAsZSwhMCksdGhpcy5yYXcodCl9Zml4ZWQzMihlKXtuKGUpO2xldCB0PW5ldyBVaW50OEFycmF5KDQpO3JldHVybiBuZXcgRGF0YVZpZXcodC5idWZmZXIpLnNldFVpbnQzMigwLGUsITApLHRoaXMucmF3KHQpfXNmaXhlZDMyKGUpe3QoZSk7bGV0IG49bmV3IFVpbnQ4QXJyYXkoNCk7cmV0dXJuIG5ldyBEYXRhVmlldyhuLmJ1ZmZlcikuc2V0SW50MzIoMCxlLCEwKSx0aGlzLnJhdyhuKX1zaW50MzIoZSl7cmV0dXJuIHQoZSksdihlPShlPDwxXmU+PjMxKT4+PjAsdGhpcy5idWYpLHRoaXN9c2ZpeGVkNjQoZSl7bGV0IHQ9bmV3IFVpbnQ4QXJyYXkoOCksbj1uZXcgRGF0YVZpZXcodC5idWZmZXIpLHI9dy5lbmMoZSk7cmV0dXJuIG4uc2V0SW50MzIoMCxyLmxvLCEwKSxuLnNldEludDMyKDQsci5oaSwhMCksdGhpcy5yYXcodCl9Zml4ZWQ2NChlKXtsZXQgdD1uZXcgVWludDhBcnJheSg4KSxuPW5ldyBEYXRhVmlldyh0LmJ1ZmZlcikscj13LnVFbmMoZSk7cmV0dXJuIG4uc2V0SW50MzIoMCxyLmxvLCEwKSxuLnNldEludDMyKDQsci5oaSwhMCksdGhpcy5yYXcodCl9aW50NjQoZSl7bGV0IHQ9dy5lbmMoZSk7cmV0dXJuIGYodC5sbyx0LmhpLHRoaXMuYnVmKSx0aGlzfXNpbnQ2NChlKXtsZXQgdD13LmVuYyhlKSxuPXQuaGk+PjMxO3JldHVybiBmKHQubG88PDFebiwodC5oaTw8MXx0LmxvPj4+MzEpXm4sdGhpcy5idWYpLHRoaXN9dWludDY0KGUpe2xldCB0PXcudUVuYyhlKTtyZXR1cm4gZih0LmxvLHQuaGksdGhpcy5idWYpLHRoaXN9fWNsYXNzIEx7Y29uc3RydWN0b3IoZSx0KXt0aGlzLnZhcmludDY0PWQsdGhpcy51aW50MzI9ayx0aGlzLmJ1Zj1lLHRoaXMubGVuPWUubGVuZ3RoLHRoaXMucG9zPTAsdGhpcy52aWV3PW5ldyBEYXRhVmlldyhlLmJ1ZmZlcixlLmJ5dGVPZmZzZXQsZS5ieXRlTGVuZ3RoKSx0aGlzLnRleHREZWNvZGVyPW51bGwhPXQ/dDpuZXcgVGV4dERlY29kZXJ9dGFnKCl7bGV0IGU9dGhpcy51aW50MzIoKSx0PWU+Pj4zLG49NyZlO2lmKHQ8PTB8fG48MHx8bj41KXRocm93IG5ldyBFcnJvcigiaWxsZWdhbCB0YWc6IGZpZWxkIG5vICIrdCsiIHdpcmUgdHlwZSAiK24pO3JldHVyblt0LG5dfXNraXAoZSx0KXtsZXQgbj10aGlzLnBvcztzd2l0Y2goZSl7Y2FzZSBFLlZhcmludDpmb3IoOzEyOCZ0aGlzLmJ1Zlt0aGlzLnBvcysrXTspO2JyZWFrO2Nhc2UgRS5CaXQ2NDp0aGlzLnBvcys9NDtjYXNlIEUuQml0MzI6dGhpcy5wb3MrPTQ7YnJlYWs7Y2FzZSBFLkxlbmd0aERlbGltaXRlZDpsZXQgbj10aGlzLnVpbnQzMigpO3RoaXMucG9zKz1uO2JyZWFrO2Nhc2UgRS5TdGFydEdyb3VwOmZvcig7Oyl7Y29uc3QgZT1BKHRoaXMudGFnKCksMiksbj1lWzBdLHI9ZVsxXTtpZihyPT09RS5FbmRHcm91cCl7aWYodm9pZCAwIT09dCYmbiE9PXQpdGhyb3cgbmV3IEVycm9yKCJpbnZhbGlkIGVuZCBncm91cCB0YWciKTticmVha310aGlzLnNraXAocixuKX1icmVhaztkZWZhdWx0OnRocm93IG5ldyBFcnJvcigiY2FudCBza2lwIHdpcmUgdHlwZSAiK2UpfXJldHVybiB0aGlzLmFzc2VydEJvdW5kcygpLHRoaXMuYnVmLnN1YmFycmF5KG4sdGhpcy5wb3MpfWFzc2VydEJvdW5kcygpe2lmKHRoaXMucG9zPnRoaXMubGVuKXRocm93IG5ldyBSYW5nZUVycm9yKCJwcmVtYXR1cmUgRU9GIil9aW50MzIoKXtyZXR1cm4gMHx0aGlzLnVpbnQzMigpfXNpbnQzMigpe2xldCBlPXRoaXMudWludDMyKCk7cmV0dXJuIGU+Pj4xXi0oMSZlKX1pbnQ2NCgpe3JldHVybiB3LmRlYyguLi50aGlzLnZhcmludDY0KCkpfXVpbnQ2NCgpe3JldHVybiB3LnVEZWMoLi4udGhpcy52YXJpbnQ2NCgpKX1zaW50NjQoKXtsZXQgZT1BKHRoaXMudmFyaW50NjQoKSwyKSx0PWVbMF0sbj1lWzFdLHI9LSgxJnQpO3JldHVybiB0PSh0Pj4+MXwoMSZuKTw8MzEpXnIsbj1uPj4+MV5yLHcuZGVjKHQsbil9Ym9vbCgpe2xldCBlPUEodGhpcy52YXJpbnQ2NCgpLDIpLHQ9ZVswXSxuPWVbMV07cmV0dXJuIDAhPT10fHwwIT09bn1maXhlZDMyKCl7cmV0dXJuIHRoaXMudmlldy5nZXRVaW50MzIoKHRoaXMucG9zKz00KS00LCEwKX1zZml4ZWQzMigpe3JldHVybiB0aGlzLnZpZXcuZ2V0SW50MzIoKHRoaXMucG9zKz00KS00LCEwKX1maXhlZDY0KCl7cmV0dXJuIHcudURlYyh0aGlzLnNmaXhlZDMyKCksdGhpcy5zZml4ZWQzMigpKX1zZml4ZWQ2NCgpe3JldHVybiB3LmRlYyh0aGlzLnNmaXhlZDMyKCksdGhpcy5zZml4ZWQzMigpKX1mbG9hdCgpe3JldHVybiB0aGlzLnZpZXcuZ2V0RmxvYXQzMigodGhpcy5wb3MrPTQpLTQsITApfWRvdWJsZSgpe3JldHVybiB0aGlzLnZpZXcuZ2V0RmxvYXQ2NCgodGhpcy5wb3MrPTgpLTgsITApfWJ5dGVzKCl7bGV0IGU9dGhpcy51aW50MzIoKSx0PXRoaXMucG9zO3JldHVybiB0aGlzLnBvcys9ZSx0aGlzLmFzc2VydEJvdW5kcygpLHRoaXMuYnVmLnN1YmFycmF5KHQsdCtlKX1zdHJpbmcoKXtyZXR1cm4gdGhpcy50ZXh0RGVjb2Rlci5kZWNvZGUodGhpcy5ieXRlcygpKX19ZnVuY3Rpb24gRihlKXtjb25zdCB0PWUuZmllbGQubG9jYWxOYW1lLG49T2JqZWN0LmNyZWF0ZShudWxsKTtyZXR1cm4gblt0XT1mdW5jdGlvbihlKXtjb25zdCB0PWUuZmllbGQ7aWYodC5yZXBlYXRlZClyZXR1cm5bXTtpZih2b2lkIDAhPT10LmRlZmF1bHQpcmV0dXJuIHQuZGVmYXVsdDtzd2l0Y2godC5raW5kKXtjYXNlImVudW0iOnJldHVybiB0LlQudmFsdWVzWzBdLm5vO2Nhc2Uic2NhbGFyIjpyZXR1cm4gSSh0LlQsdC5MKTtjYXNlIm1lc3NhZ2UiOmNvbnN0IGU9dC5ULG49bmV3IGU7cmV0dXJuIGUuZmllbGRXcmFwcGVyP2UuZmllbGRXcmFwcGVyLnVud3JhcEZpZWxkKG4pOm47Y2FzZSJtYXAiOnRocm93Im1hcCBmaWVsZHMgYXJlIG5vdCBhbGxvd2VkIHRvIGJlIGV4dGVuc2lvbnMifX0oZSksW24sKCk9Pm5bdF1dfWxldCBEPSJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvIi5zcGxpdCgiIiksUj1bXTtmb3IobGV0IGU9MDtlPEQubGVuZ3RoO2UrKylSW0RbZV0uY2hhckNvZGVBdCgwKV09ZTtSWyItIi5jaGFyQ29kZUF0KDApXT1ELmluZGV4T2YoIisiKSxSWyJfIi5jaGFyQ29kZUF0KDApXT1ELmluZGV4T2YoIi8iKTtjb25zdCBCPXtkZWMoZSl7bGV0IHQ9MyplLmxlbmd0aC80OyI9Ij09ZVtlLmxlbmd0aC0yXT90LT0yOiI9Ij09ZVtlLmxlbmd0aC0xXSYmKHQtPTEpO2xldCBuLHI9bmV3IFVpbnQ4QXJyYXkodCksaT0wLGE9MCxvPTA7Zm9yKGxldCB0PTA7dDxlLmxlbmd0aDt0Kyspe2lmKG49UltlLmNoYXJDb2RlQXQodCldLHZvaWQgMD09PW4pc3dpdGNoKGVbdF0pe2Nhc2UiPSI6YT0wO2Nhc2UiXG4iOmNhc2UiXHIiOmNhc2UiXHQiOmNhc2UiICI6Y29udGludWU7ZGVmYXVsdDp0aHJvdyBFcnJvcigiaW52YWxpZCBiYXNlNjQgc3RyaW5nLiIpfXN3aXRjaChhKXtjYXNlIDA6bz1uLGE9MTticmVhaztjYXNlIDE6cltpKytdPW88PDJ8KDQ4Jm4pPj40LG89bixhPTI7YnJlYWs7Y2FzZSAyOnJbaSsrXT0oMTUmbyk8PDR8KDYwJm4pPj4yLG89bixhPTM7YnJlYWs7Y2FzZSAzOnJbaSsrXT0oMyZvKTw8NnxuLGE9MH19aWYoMT09YSl0aHJvdyBFcnJvcigiaW52YWxpZCBiYXNlNjQgc3RyaW5nLiIpO3JldHVybiByLnN1YmFycmF5KDAsaSl9LGVuYyhlKXtsZXQgdCxuPSIiLHI9MCxpPTA7Zm9yKGxldCBhPTA7YTxlLmxlbmd0aDthKyspc3dpdGNoKHQ9ZVthXSxyKXtjYXNlIDA6bis9RFt0Pj4yXSxpPSgzJnQpPDw0LHI9MTticmVhaztjYXNlIDE6bis9RFtpfHQ+PjRdLGk9KDE1JnQpPDwyLHI9MjticmVhaztjYXNlIDI6bis9RFtpfHQ+PjZdLG4rPURbNjMmdF0scj0wfXJldHVybiByJiYobis9RFtpXSxuKz0iPSIsMT09ciYmKG4rPSI9IikpLG59fTtmdW5jdGlvbiBQKGUsdCxuKXtNKHQsZSk7Y29uc3Qgcj10LnJ1bnRpbWUuYmluLm1ha2VSZWFkT3B0aW9ucyhuKSxpPWZ1bmN0aW9uKGUsdCl7aWYoIXQucmVwZWF0ZWQmJigiZW51bSI9PXQua2luZHx8InNjYWxhciI9PXQua2luZCkpe2ZvcihsZXQgbj1lLmxlbmd0aC0xO24+PTA7LS1uKWlmKGVbbl0ubm89PXQubm8pcmV0dXJuW2Vbbl1dO3JldHVybltdfXJldHVybiBlLmZpbHRlcigoZT0+ZS5ubz09PXQubm8pKX0oZS5nZXRUeXBlKCkucnVudGltZS5iaW4ubGlzdFVua25vd25GaWVsZHMoZSksdC5maWVsZCksYT1BKEYodCksMiksbz1hWzBdLHM9YVsxXTtmb3IoY29uc3QgZSBvZiBpKXQucnVudGltZS5iaW4ucmVhZEZpZWxkKG8sci5yZWFkZXJGYWN0b3J5KGUuZGF0YSksdC5maWVsZCxlLndpcmVUeXBlLHIpO3JldHVybiBzKCl9ZnVuY3Rpb24geChlLHQsbixyKXtNKHQsZSk7Y29uc3QgaT10LnJ1bnRpbWUuYmluLm1ha2VSZWFkT3B0aW9ucyhyKSxhPXQucnVudGltZS5iaW4ubWFrZVdyaXRlT3B0aW9ucyhyKTtpZihqKGUsdCkpe2NvbnN0IG49ZS5nZXRUeXBlKCkucnVudGltZS5iaW4ubGlzdFVua25vd25GaWVsZHMoZSkuZmlsdGVyKChlPT5lLm5vIT10LmZpZWxkLm5vKSk7ZS5nZXRUeXBlKCkucnVudGltZS5iaW4uZGlzY2FyZFVua25vd25GaWVsZHMoZSk7Zm9yKGNvbnN0IHQgb2YgbillLmdldFR5cGUoKS5ydW50aW1lLmJpbi5vblVua25vd25GaWVsZChlLHQubm8sdC53aXJlVHlwZSx0LmRhdGEpfWNvbnN0IG89YS53cml0ZXJGYWN0b3J5KCk7bGV0IHM9dC5maWVsZDtzLm9wdHx8cy5yZXBlYXRlZHx8ImVudW0iIT1zLmtpbmQmJiJzY2FsYXIiIT1zLmtpbmR8fChzPU9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSx0LmZpZWxkKSx7b3B0OiEwfSkpLHQucnVudGltZS5iaW4ud3JpdGVGaWVsZChzLG4sbyxhKTtjb25zdCBjPWkucmVhZGVyRmFjdG9yeShvLmZpbmlzaCgpKTtmb3IoO2MucG9zPGMubGVuOyl7Y29uc3QgdD1BKGMudGFnKCksMiksbj10WzBdLHI9dFsxXSxpPWMuc2tpcChyLG4pO2UuZ2V0VHlwZSgpLnJ1bnRpbWUuYmluLm9uVW5rbm93bkZpZWxkKGUsbixyLGkpfX1mdW5jdGlvbiBqKGUsdCl7Y29uc3Qgbj1lLmdldFR5cGUoKTtyZXR1cm4gdC5leHRlbmRlZS50eXBlTmFtZT09PW4udHlwZU5hbWUmJiEhbi5ydW50aW1lLmJpbi5saXN0VW5rbm93bkZpZWxkcyhlKS5maW5kKChlPT5lLm5vPT10LmZpZWxkLm5vKSl9ZnVuY3Rpb24gTSh0LG4pe2UodC5leHRlbmRlZS50eXBlTmFtZT09bi5nZXRUeXBlKCkudHlwZU5hbWUsImV4dGVuc2lvbiAiLmNvbmNhdCh0LnR5cGVOYW1lLCIgY2FuIG9ubHkgYmUgYXBwbGllZCB0byBtZXNzYWdlICIpLmNvbmNhdCh0LmV4dGVuZGVlLnR5cGVOYW1lKSl9ZnVuY3Rpb24gVihlLHQpe2NvbnN0IG49ZS5sb2NhbE5hbWU7aWYoZS5yZXBlYXRlZClyZXR1cm4gdFtuXS5sZW5ndGg+MDtpZihlLm9uZW9mKXJldHVybiB0W2Uub25lb2YubG9jYWxOYW1lXS5jYXNlPT09bjtzd2l0Y2goZS5raW5kKXtjYXNlImVudW0iOmNhc2Uic2NhbGFyIjpyZXR1cm4gZS5vcHR8fGUucmVxP3ZvaWQgMCE9PXRbbl06ImVudW0iPT1lLmtpbmQ/dFtuXSE9PWUuVC52YWx1ZXNbMF0ubm86IU8oZS5ULHRbbl0pO2Nhc2UibWVzc2FnZSI6cmV0dXJuIHZvaWQgMCE9PXRbbl07Y2FzZSJtYXAiOnJldHVybiBPYmplY3Qua2V5cyh0W25dKS5sZW5ndGg+MH19ZnVuY3Rpb24gXyhlLHQpe2NvbnN0IG49ZS5sb2NhbE5hbWUscj0hZS5vcHQmJiFlLnJlcTtpZihlLnJlcGVhdGVkKXRbbl09W107ZWxzZSBpZihlLm9uZW9mKXRbZS5vbmVvZi5sb2NhbE5hbWVdPXtjYXNlOnZvaWQgMH07ZWxzZSBzd2l0Y2goZS5raW5kKXtjYXNlIm1hcCI6dFtuXT17fTticmVhaztjYXNlImVudW0iOnRbbl09cj9lLlQudmFsdWVzWzBdLm5vOnZvaWQgMDticmVhaztjYXNlInNjYWxhciI6dFtuXT1yP0koZS5ULGUuTCk6dm9pZCAwO2JyZWFrO2Nhc2UibWVzc2FnZSI6dFtuXT12b2lkIDB9fWZ1bmN0aW9uIEooZSx0KXtpZihudWxsPT09ZXx8Im9iamVjdCIhPXR5cGVvZiBlKXJldHVybiExO2lmKCFPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhsLnByb3RvdHlwZSkuZXZlcnkoKHQ9PnQgaW4gZSYmImZ1bmN0aW9uIj09dHlwZW9mIGVbdF0pKSlyZXR1cm4hMTtjb25zdCBuPWUuZ2V0VHlwZSgpO3JldHVybiBudWxsIT09biYmImZ1bmN0aW9uIj09dHlwZW9mIG4mJiJ0eXBlTmFtZSJpbiBuJiYic3RyaW5nIj09dHlwZW9mIG4udHlwZU5hbWUmJih2b2lkIDA9PT10fHxuLnR5cGVOYW1lPT10LnR5cGVOYW1lKX1mdW5jdGlvbiBHKGUsdCl7cmV0dXJuIEoodCl8fCFlLmZpZWxkV3JhcHBlcj90OmUuZmllbGRXcmFwcGVyLndyYXBGaWVsZCh0KX1ULkRPVUJMRSxULkZMT0FULFQuSU5UNjQsVC5VSU5UNjQsVC5JTlQzMixULlVJTlQzMixULkJPT0wsVC5TVFJJTkcsVC5CWVRFUztjb25zdCBYPXtpZ25vcmVVbmtub3duRmllbGRzOiExfSxxPXtlbWl0RGVmYXVsdFZhbHVlczohMSxlbnVtQXNJbnRlZ2VyOiExLHVzZVByb3RvRmllbGROYW1lOiExLHByZXR0eVNwYWNlczowfTtmdW5jdGlvbiBXKGUpe3JldHVybiBlP09iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSxYKSxlKTpYfWZ1bmN0aW9uIEgoZSl7cmV0dXJuIGU/T2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LHEpLGUpOnF9Y29uc3QgWT1TeW1ib2woKSxLPVN5bWJvbCgpO2Z1bmN0aW9uIFEoZSl7aWYobnVsbD09PWUpcmV0dXJuIm51bGwiO3N3aXRjaCh0eXBlb2YgZSl7Y2FzZSJvYmplY3QiOnJldHVybiBBcnJheS5pc0FycmF5KGUpPyJhcnJheSI6Im9iamVjdCI7Y2FzZSJzdHJpbmciOnJldHVybiBlLmxlbmd0aD4xMDA/InN0cmluZyI6JyInLmNvbmNhdChlLnNwbGl0KCciJykuam9pbignXFwiJyksJyInKTtkZWZhdWx0OnJldHVybiBTdHJpbmcoZSl9fWZ1bmN0aW9uIHoodCxuLHIsaSxhKXtsZXQgbz1yLmxvY2FsTmFtZTtpZihyLnJlcGVhdGVkKXtpZihlKCJtYXAiIT1yLmtpbmQpLG51bGw9PT1uKXJldHVybjtpZighQXJyYXkuaXNBcnJheShuKSl0aHJvdyBuZXcgRXJyb3IoImNhbm5vdCBkZWNvZGUgZmllbGQgIi5jb25jYXQoYS50eXBlTmFtZSwiLiIpLmNvbmNhdChyLm5hbWUsIiBmcm9tIEpTT046ICIpLmNvbmNhdChRKG4pKSk7Y29uc3Qgcz10W29dO2Zvcihjb25zdCBlIG9mIG4pe2lmKG51bGw9PT1lKXRocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSBmaWVsZCAiLmNvbmNhdChhLnR5cGVOYW1lLCIuIikuY29uY2F0KHIubmFtZSwiIGZyb20gSlNPTjogIikuY29uY2F0KFEoZSkpKTtzd2l0Y2goci5raW5kKXtjYXNlIm1lc3NhZ2UiOnMucHVzaChyLlQuZnJvbUpzb24oZSxpKSk7YnJlYWs7Y2FzZSJlbnVtIjpjb25zdCB0PWVlKHIuVCxlLGkuaWdub3JlVW5rbm93bkZpZWxkcywhMCk7dCE9PUsmJnMucHVzaCh0KTticmVhaztjYXNlInNjYWxhciI6dHJ5e3MucHVzaChaKHIuVCxlLHIuTCwhMCkpfWNhdGNoKHQpe2xldCBuPSJjYW5ub3QgZGVjb2RlIGZpZWxkICIuY29uY2F0KGEudHlwZU5hbWUsIi4iKS5jb25jYXQoci5uYW1lLCIgZnJvbSBKU09OOiAiKS5jb25jYXQoUShlKSk7dGhyb3cgdCBpbnN0YW5jZW9mIEVycm9yJiZ0Lm1lc3NhZ2UubGVuZ3RoPjAmJihuKz0iOiAiLmNvbmNhdCh0Lm1lc3NhZ2UpKSxuZXcgRXJyb3Iobil9fX19ZWxzZSBpZigibWFwIj09ci5raW5kKXtpZihudWxsPT09bilyZXR1cm47aWYoIm9iamVjdCIhPXR5cGVvZiBufHxBcnJheS5pc0FycmF5KG4pKXRocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSBmaWVsZCAiLmNvbmNhdChhLnR5cGVOYW1lLCIuIikuY29uY2F0KHIubmFtZSwiIGZyb20gSlNPTjogIikuY29uY2F0KFEobikpKTtjb25zdCBlPXRbb107Zm9yKGNvbnN0IHQgb2YgT2JqZWN0LmVudHJpZXMobikpe3ZhciBzPUEodCwyKTtjb25zdCBvPXNbMF0sYz1zWzFdO2lmKG51bGw9PT1jKXRocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSBmaWVsZCAiLmNvbmNhdChhLnR5cGVOYW1lLCIuIikuY29uY2F0KHIubmFtZSwiIGZyb20gSlNPTjogbWFwIHZhbHVlIG51bGwiKSk7bGV0IHU7dHJ5e3U9JChyLkssbyl9Y2F0Y2goZSl7bGV0IHQ9ImNhbm5vdCBkZWNvZGUgbWFwIGtleSBmb3IgZmllbGQgIi5jb25jYXQoYS50eXBlTmFtZSwiLiIpLmNvbmNhdChyLm5hbWUsIiBmcm9tIEpTT046ICIpLmNvbmNhdChRKG4pKTt0aHJvdyBlIGluc3RhbmNlb2YgRXJyb3ImJmUubWVzc2FnZS5sZW5ndGg+MCYmKHQrPSI6ICIuY29uY2F0KGUubWVzc2FnZSkpLG5ldyBFcnJvcih0KX1zd2l0Y2goci5WLmtpbmQpe2Nhc2UibWVzc2FnZSI6ZVt1XT1yLlYuVC5mcm9tSnNvbihjLGkpO2JyZWFrO2Nhc2UiZW51bSI6Y29uc3QgdD1lZShyLlYuVCxjLGkuaWdub3JlVW5rbm93bkZpZWxkcywhMCk7dCE9PUsmJihlW3VdPXQpO2JyZWFrO2Nhc2Uic2NhbGFyIjp0cnl7ZVt1XT1aKHIuVi5ULGMsUy5CSUdJTlQsITApfWNhdGNoKGUpe2xldCB0PSJjYW5ub3QgZGVjb2RlIG1hcCB2YWx1ZSBmb3IgZmllbGQgIi5jb25jYXQoYS50eXBlTmFtZSwiLiIpLmNvbmNhdChyLm5hbWUsIiBmcm9tIEpTT046ICIpLmNvbmNhdChRKG4pKTt0aHJvdyBlIGluc3RhbmNlb2YgRXJyb3ImJmUubWVzc2FnZS5sZW5ndGg+MCYmKHQrPSI6ICIuY29uY2F0KGUubWVzc2FnZSkpLG5ldyBFcnJvcih0KX19fX1lbHNlIHN3aXRjaChyLm9uZW9mJiYodD10W3Iub25lb2YubG9jYWxOYW1lXT17Y2FzZTpvfSxvPSJ2YWx1ZSIpLHIua2luZCl7Y2FzZSJtZXNzYWdlIjpjb25zdCBlPXIuVDtpZihudWxsPT09biYmImdvb2dsZS5wcm90b2J1Zi5WYWx1ZSIhPWUudHlwZU5hbWUpcmV0dXJuO2xldCBzPXRbb107SihzKT9zLmZyb21Kc29uKG4saSk6KHRbb109cz1lLmZyb21Kc29uKG4saSksZS5maWVsZFdyYXBwZXImJiFyLm9uZW9mJiYodFtvXT1lLmZpZWxkV3JhcHBlci51bndyYXBGaWVsZChzKSkpO2JyZWFrO2Nhc2UiZW51bSI6Y29uc3QgYz1lZShyLlQsbixpLmlnbm9yZVVua25vd25GaWVsZHMsITEpO3N3aXRjaChjKXtjYXNlIFk6XyhyLHQpO2JyZWFrO2Nhc2UgSzpicmVhaztkZWZhdWx0OnRbb109Y31icmVhaztjYXNlInNjYWxhciI6dHJ5e2NvbnN0IGU9WihyLlQsbixyLkwsITEpO2lmKGU9PT1ZKV8ocix0KTtlbHNlIHRbb109ZX1jYXRjaChlKXtsZXQgdD0iY2Fubm90IGRlY29kZSBmaWVsZCAiLmNvbmNhdChhLnR5cGVOYW1lLCIuIikuY29uY2F0KHIubmFtZSwiIGZyb20gSlNPTjogIikuY29uY2F0KFEobikpO3Rocm93IGUgaW5zdGFuY2VvZiBFcnJvciYmZS5tZXNzYWdlLmxlbmd0aD4wJiYodCs9IjogIi5jb25jYXQoZS5tZXNzYWdlKSksbmV3IEVycm9yKHQpfX19ZnVuY3Rpb24gJChlLHQpe2lmKGU9PT1ULkJPT0wpc3dpdGNoKHQpe2Nhc2UidHJ1ZSI6dD0hMDticmVhaztjYXNlImZhbHNlIjp0PSExfXJldHVybiBaKGUsdCxTLkJJR0lOVCwhMCkudG9TdHJpbmcoKX1mdW5jdGlvbiBaKGUsaSxhLG8pe2lmKG51bGw9PT1pKXJldHVybiBvP0koZSxhKTpZO3N3aXRjaChlKXtjYXNlIFQuRE9VQkxFOmNhc2UgVC5GTE9BVDppZigiTmFOIj09PWkpcmV0dXJuIE51bWJlci5OYU47aWYoIkluZmluaXR5Ij09PWkpcmV0dXJuIE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtpZigiLUluZmluaXR5Ij09PWkpcmV0dXJuIE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtpZigiIj09PWkpYnJlYWs7aWYoInN0cmluZyI9PXR5cGVvZiBpJiZpLnRyaW0oKS5sZW5ndGghPT1pLmxlbmd0aClicmVhaztpZigic3RyaW5nIiE9dHlwZW9mIGkmJiJudW1iZXIiIT10eXBlb2YgaSlicmVhaztjb25zdCBvPU51bWJlcihpKTtpZihOdW1iZXIuaXNOYU4obykpYnJlYWs7aWYoIU51bWJlci5pc0Zpbml0ZShvKSlicmVhaztyZXR1cm4gZT09VC5GTE9BVCYmcihvKSxvO2Nhc2UgVC5JTlQzMjpjYXNlIFQuRklYRUQzMjpjYXNlIFQuU0ZJWEVEMzI6Y2FzZSBULlNJTlQzMjpjYXNlIFQuVUlOVDMyOmxldCBzO2lmKCJudW1iZXIiPT10eXBlb2YgaT9zPWk6InN0cmluZyI9PXR5cGVvZiBpJiZpLmxlbmd0aD4wJiZpLnRyaW0oKS5sZW5ndGg9PT1pLmxlbmd0aCYmKHM9TnVtYmVyKGkpKSx2b2lkIDA9PT1zKWJyZWFrO3JldHVybiBlPT1ULlVJTlQzMnx8ZT09VC5GSVhFRDMyP24ocyk6dChzKSxzO2Nhc2UgVC5JTlQ2NDpjYXNlIFQuU0ZJWEVENjQ6Y2FzZSBULlNJTlQ2NDppZigibnVtYmVyIiE9dHlwZW9mIGkmJiJzdHJpbmciIT10eXBlb2YgaSlicmVhaztjb25zdCBjPXcucGFyc2UoaSk7cmV0dXJuIGE/Yy50b1N0cmluZygpOmM7Y2FzZSBULkZJWEVENjQ6Y2FzZSBULlVJTlQ2NDppZigibnVtYmVyIiE9dHlwZW9mIGkmJiJzdHJpbmciIT10eXBlb2YgaSlicmVhaztjb25zdCB1PXcudVBhcnNlKGkpO3JldHVybiBhP3UudG9TdHJpbmcoKTp1O2Nhc2UgVC5CT09MOmlmKCJib29sZWFuIiE9dHlwZW9mIGkpYnJlYWs7cmV0dXJuIGk7Y2FzZSBULlNUUklORzppZigic3RyaW5nIiE9dHlwZW9mIGkpYnJlYWs7dHJ5e2VuY29kZVVSSUNvbXBvbmVudChpKX1jYXRjaChlKXt0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgVVRGOCIpfXJldHVybiBpO2Nhc2UgVC5CWVRFUzppZigiIj09PWkpcmV0dXJuIG5ldyBVaW50OEFycmF5KDApO2lmKCJzdHJpbmciIT10eXBlb2YgaSlicmVhaztyZXR1cm4gQi5kZWMoaSl9dGhyb3cgbmV3IEVycm9yfWZ1bmN0aW9uIGVlKGUsdCxuLHIpe2lmKG51bGw9PT10KXJldHVybiJnb29nbGUucHJvdG9idWYuTnVsbFZhbHVlIj09ZS50eXBlTmFtZT8wOnI/ZS52YWx1ZXNbMF0ubm86WTtzd2l0Y2godHlwZW9mIHQpe2Nhc2UibnVtYmVyIjppZihOdW1iZXIuaXNJbnRlZ2VyKHQpKXJldHVybiB0O2JyZWFrO2Nhc2Uic3RyaW5nIjpjb25zdCByPWUuZmluZE5hbWUodCk7aWYodm9pZCAwIT09cilyZXR1cm4gci5ubztpZihuKXJldHVybiBLfXRocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSBlbnVtICIuY29uY2F0KGUudHlwZU5hbWUsIiBmcm9tIEpTT046ICIpLmNvbmNhdChRKHQpKSl9ZnVuY3Rpb24gdGUoZSl7cmV0dXJuISghZS5yZXBlYXRlZCYmIm1hcCIhPWUua2luZCl8fCFlLm9uZW9mJiYoIm1lc3NhZ2UiIT1lLmtpbmQmJighZS5vcHQmJiFlLnJlcSkpfWZ1bmN0aW9uIG5lKHQsbixyKXtpZigibWFwIj09dC5raW5kKXtlKCJvYmplY3QiPT10eXBlb2YgbiYmbnVsbCE9bik7Y29uc3Qgcz17fSxjPU9iamVjdC5lbnRyaWVzKG4pO3N3aXRjaCh0LlYua2luZCl7Y2FzZSJzY2FsYXIiOmZvcihjb25zdCBlIG9mIGMpe3ZhciBpPUEoZSwyKTtjb25zdCBuPWlbMF0scj1pWzFdO3Nbbi50b1N0cmluZygpXT1pZSh0LlYuVCxyKX1icmVhaztjYXNlIm1lc3NhZ2UiOmZvcihjb25zdCBlIG9mIGMpe3ZhciBhPUEoZSwyKTtjb25zdCB0PWFbMF0sbj1hWzFdO3NbdC50b1N0cmluZygpXT1uLnRvSnNvbihyKX1icmVhaztjYXNlImVudW0iOmNvbnN0IGU9dC5WLlQ7Zm9yKGNvbnN0IHQgb2YgYyl7dmFyIG89QSh0LDIpO2NvbnN0IG49b1swXSxpPW9bMV07c1tuLnRvU3RyaW5nKCldPXJlKGUsaSxyLmVudW1Bc0ludGVnZXIpfX1yZXR1cm4gci5lbWl0RGVmYXVsdFZhbHVlc3x8Yy5sZW5ndGg+MD9zOnZvaWQgMH1pZih0LnJlcGVhdGVkKXtlKEFycmF5LmlzQXJyYXkobikpO2NvbnN0IGk9W107c3dpdGNoKHQua2luZCl7Y2FzZSJzY2FsYXIiOmZvcihsZXQgZT0wO2U8bi5sZW5ndGg7ZSsrKWkucHVzaChpZSh0LlQsbltlXSkpO2JyZWFrO2Nhc2UiZW51bSI6Zm9yKGxldCBlPTA7ZTxuLmxlbmd0aDtlKyspaS5wdXNoKHJlKHQuVCxuW2VdLHIuZW51bUFzSW50ZWdlcikpO2JyZWFrO2Nhc2UibWVzc2FnZSI6Zm9yKGxldCBlPTA7ZTxuLmxlbmd0aDtlKyspaS5wdXNoKG5bZV0udG9Kc29uKHIpKX1yZXR1cm4gci5lbWl0RGVmYXVsdFZhbHVlc3x8aS5sZW5ndGg+MD9pOnZvaWQgMH1zd2l0Y2godC5raW5kKXtjYXNlInNjYWxhciI6cmV0dXJuIGllKHQuVCxuKTtjYXNlImVudW0iOnJldHVybiByZSh0LlQsbixyLmVudW1Bc0ludGVnZXIpO2Nhc2UibWVzc2FnZSI6cmV0dXJuIEcodC5ULG4pLnRvSnNvbihyKX19ZnVuY3Rpb24gcmUodCxuLHIpe3ZhciBpO2lmKGUoIm51bWJlciI9PXR5cGVvZiBuKSwiZ29vZ2xlLnByb3RvYnVmLk51bGxWYWx1ZSI9PXQudHlwZU5hbWUpcmV0dXJuIG51bGw7aWYocilyZXR1cm4gbjtjb25zdCBhPXQuZmluZE51bWJlcihuKTtyZXR1cm4gbnVsbCE9PShpPW51bGw9PWE/dm9pZCAwOmEubmFtZSkmJnZvaWQgMCE9PWk/aTpufWZ1bmN0aW9uIGllKHQsbil7c3dpdGNoKHQpe2Nhc2UgVC5JTlQzMjpjYXNlIFQuU0ZJWEVEMzI6Y2FzZSBULlNJTlQzMjpjYXNlIFQuRklYRUQzMjpjYXNlIFQuVUlOVDMyOnJldHVybiBlKCJudW1iZXIiPT10eXBlb2YgbiksbjtjYXNlIFQuRkxPQVQ6Y2FzZSBULkRPVUJMRTpyZXR1cm4gZSgibnVtYmVyIj09dHlwZW9mIG4pLE51bWJlci5pc05hTihuKT8iTmFOIjpuPT09TnVtYmVyLlBPU0lUSVZFX0lORklOSVRZPyJJbmZpbml0eSI6bj09PU51bWJlci5ORUdBVElWRV9JTkZJTklUWT8iLUluZmluaXR5IjpuO2Nhc2UgVC5TVFJJTkc6cmV0dXJuIGUoInN0cmluZyI9PXR5cGVvZiBuKSxuO2Nhc2UgVC5CT09MOnJldHVybiBlKCJib29sZWFuIj09dHlwZW9mIG4pLG47Y2FzZSBULlVJTlQ2NDpjYXNlIFQuRklYRUQ2NDpjYXNlIFQuSU5UNjQ6Y2FzZSBULlNGSVhFRDY0OmNhc2UgVC5TSU5UNjQ6cmV0dXJuIGUoImJpZ2ludCI9PXR5cGVvZiBufHwic3RyaW5nIj09dHlwZW9mIG58fCJudW1iZXIiPT10eXBlb2Ygbiksbi50b1N0cmluZygpO2Nhc2UgVC5CWVRFUzpyZXR1cm4gZShuIGluc3RhbmNlb2YgVWludDhBcnJheSksQi5lbmMobil9fWNvbnN0IGFlPVN5bWJvbCgiQGJ1ZmJ1aWxkL3Byb3RvYnVmL3Vua25vd24tZmllbGRzIiksb2U9e3JlYWRVbmtub3duRmllbGRzOiEwLHJlYWRlckZhY3Rvcnk6ZT0+bmV3IEwoZSl9LHNlPXt3cml0ZVVua25vd25GaWVsZHM6ITAsd3JpdGVyRmFjdG9yeTooKT0+bmV3IFV9O2Z1bmN0aW9uIGNlKGUpe3JldHVybiBlP09iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSxvZSksZSk6b2V9ZnVuY3Rpb24gdWUoZSl7cmV0dXJuIGU/T2JqZWN0LmFzc2lnbihPYmplY3QuYXNzaWduKHt9LHNlKSxlKTpzZX1mdW5jdGlvbiBsZShlLHQsbixyLGkpe2xldCBhPW4ucmVwZWF0ZWQsbz1uLmxvY2FsTmFtZTtzd2l0Y2gobi5vbmVvZiYmKChlPWVbbi5vbmVvZi5sb2NhbE5hbWVdKS5jYXNlIT1vJiZkZWxldGUgZS52YWx1ZSxlLmNhc2U9byxvPSJ2YWx1ZSIpLG4ua2luZCl7Y2FzZSJzY2FsYXIiOmNhc2UiZW51bSI6Y29uc3Qgcz0iZW51bSI9PW4ua2luZD9ULklOVDMyOm4uVDtsZXQgYz1oZTtpZigic2NhbGFyIj09bi5raW5kJiZuLkw+MCYmKGM9ZmUpLGEpe2xldCBuPWVbb107aWYocj09RS5MZW5ndGhEZWxpbWl0ZWQmJnMhPVQuU1RSSU5HJiZzIT1ULkJZVEVTKXtsZXQgZT10LnVpbnQzMigpK3QucG9zO2Zvcig7dC5wb3M8ZTspbi5wdXNoKGModCxzKSl9ZWxzZSBuLnB1c2goYyh0LHMpKX1lbHNlIGVbb109Yyh0LHMpO2JyZWFrO2Nhc2UibWVzc2FnZSI6Y29uc3QgdT1uLlQ7YT9lW29dLnB1c2goZGUodCxuZXcgdSxpLG4pKTpKKGVbb10pP2RlKHQsZVtvXSxpLG4pOihlW29dPWRlKHQsbmV3IHUsaSxuKSwhdS5maWVsZFdyYXBwZXJ8fG4ub25lb2Z8fG4ucmVwZWF0ZWR8fChlW29dPXUuZmllbGRXcmFwcGVyLnVud3JhcEZpZWxkKGVbb10pKSk7YnJlYWs7Y2FzZSJtYXAiOmxldCBsPWZ1bmN0aW9uKGUsdCxuKXtjb25zdCByPXQudWludDMyKCksaT10LnBvcytyO2xldCBhLG87Zm9yKDt0LnBvczxpOyl7c3dpdGNoKEEodC50YWcoKSwxKVswXSl7Y2FzZSAxOmE9aGUodCxlLkspO2JyZWFrO2Nhc2UgMjpzd2l0Y2goZS5WLmtpbmQpe2Nhc2Uic2NhbGFyIjpvPWhlKHQsZS5WLlQpO2JyZWFrO2Nhc2UiZW51bSI6bz10LmludDMyKCk7YnJlYWs7Y2FzZSJtZXNzYWdlIjpvPWRlKHQsbmV3IGUuVi5ULG4sdm9pZCAwKX19fXZvaWQgMD09PWEmJihhPUkoZS5LLFMuQklHSU5UKSk7InN0cmluZyIhPXR5cGVvZiBhJiYibnVtYmVyIiE9dHlwZW9mIGEmJihhPWEudG9TdHJpbmcoKSk7aWYodm9pZCAwPT09bylzd2l0Y2goZS5WLmtpbmQpe2Nhc2Uic2NhbGFyIjpvPUkoZS5WLlQsUy5CSUdJTlQpO2JyZWFrO2Nhc2UiZW51bSI6bz1lLlYuVC52YWx1ZXNbMF0ubm87YnJlYWs7Y2FzZSJtZXNzYWdlIjpvPW5ldyBlLlYuVH1yZXR1cm5bYSxvXX0obix0LGkpLGQ9QShsLDIpLGY9ZFswXSxoPWRbMV07ZVtvXVtmXT1ofX1mdW5jdGlvbiBkZShlLHQsbixyKXtjb25zdCBpPXQuZ2V0VHlwZSgpLnJ1bnRpbWUuYmluLGE9bnVsbD09cj92b2lkIDA6ci5kZWxpbWl0ZWQ7cmV0dXJuIGkucmVhZE1lc3NhZ2UodCxlLGE/ci5ubzplLnVpbnQzMigpLG4sYSksdH1mdW5jdGlvbiBmZShlLHQpe2NvbnN0IG49aGUoZSx0KTtyZXR1cm4iYmlnaW50Ij09dHlwZW9mIG4/bi50b1N0cmluZygpOm59ZnVuY3Rpb24gaGUoZSx0KXtzd2l0Y2godCl7Y2FzZSBULlNUUklORzpyZXR1cm4gZS5zdHJpbmcoKTtjYXNlIFQuQk9PTDpyZXR1cm4gZS5ib29sKCk7Y2FzZSBULkRPVUJMRTpyZXR1cm4gZS5kb3VibGUoKTtjYXNlIFQuRkxPQVQ6cmV0dXJuIGUuZmxvYXQoKTtjYXNlIFQuSU5UMzI6cmV0dXJuIGUuaW50MzIoKTtjYXNlIFQuSU5UNjQ6cmV0dXJuIGUuaW50NjQoKTtjYXNlIFQuVUlOVDY0OnJldHVybiBlLnVpbnQ2NCgpO2Nhc2UgVC5GSVhFRDY0OnJldHVybiBlLmZpeGVkNjQoKTtjYXNlIFQuQllURVM6cmV0dXJuIGUuYnl0ZXMoKTtjYXNlIFQuRklYRUQzMjpyZXR1cm4gZS5maXhlZDMyKCk7Y2FzZSBULlNGSVhFRDMyOnJldHVybiBlLnNmaXhlZDMyKCk7Y2FzZSBULlNGSVhFRDY0OnJldHVybiBlLnNmaXhlZDY0KCk7Y2FzZSBULlNJTlQ2NDpyZXR1cm4gZS5zaW50NjQoKTtjYXNlIFQuVUlOVDMyOnJldHVybiBlLnVpbnQzMigpO2Nhc2UgVC5TSU5UMzI6cmV0dXJuIGUuc2ludDMyKCl9fWZ1bmN0aW9uIHBlKHQsbixyLGkpe2Uodm9pZCAwIT09bik7Y29uc3QgYT10LnJlcGVhdGVkO3N3aXRjaCh0LmtpbmQpe2Nhc2Uic2NhbGFyIjpjYXNlImVudW0iOmxldCBzPSJlbnVtIj09dC5raW5kP1QuSU5UMzI6dC5UO2lmKGEpaWYoZShBcnJheS5pc0FycmF5KG4pKSx0LnBhY2tlZCkhZnVuY3Rpb24oZSx0LG4scil7aWYoIXIubGVuZ3RoKXJldHVybjtlLnRhZyhuLEUuTGVuZ3RoRGVsaW1pdGVkKS5mb3JrKCk7bGV0IGk9QSh5ZSh0KSwyKVsxXTtmb3IobGV0IHQ9MDt0PHIubGVuZ3RoO3QrKyllW2ldKHJbdF0pO2Uuam9pbigpfShyLHMsdC5ubyxuKTtlbHNlIGZvcihjb25zdCBlIG9mIG4pYmUocixzLHQubm8sZSk7ZWxzZSBiZShyLHMsdC5ubyxuKTticmVhaztjYXNlIm1lc3NhZ2UiOmlmKGEpe2UoQXJyYXkuaXNBcnJheShuKSk7Zm9yKGNvbnN0IGUgb2YgbilnZShyLGksdCxlKX1lbHNlIGdlKHIsaSx0LG4pO2JyZWFrO2Nhc2UibWFwIjplKCJvYmplY3QiPT10eXBlb2YgbiYmbnVsbCE9bik7Zm9yKGNvbnN0IGUgb2YgT2JqZWN0LmVudHJpZXMobikpe3ZhciBvPUEoZSwyKTttZShyLGksdCxvWzBdLG9bMV0pfX19ZnVuY3Rpb24gbWUodCxuLHIsaSxhKXt0LnRhZyhyLm5vLEUuTGVuZ3RoRGVsaW1pdGVkKSx0LmZvcmsoKTtsZXQgbz1pO3N3aXRjaChyLkspe2Nhc2UgVC5JTlQzMjpjYXNlIFQuRklYRUQzMjpjYXNlIFQuVUlOVDMyOmNhc2UgVC5TRklYRUQzMjpjYXNlIFQuU0lOVDMyOm89TnVtYmVyLnBhcnNlSW50KGkpO2JyZWFrO2Nhc2UgVC5CT09MOmUoInRydWUiPT1pfHwiZmFsc2UiPT1pKSxvPSJ0cnVlIj09aX1zd2l0Y2goYmUodCxyLkssMSxvKSxyLlYua2luZCl7Y2FzZSJzY2FsYXIiOmJlKHQsci5WLlQsMixhKTticmVhaztjYXNlImVudW0iOmJlKHQsVC5JTlQzMiwyLGEpO2JyZWFrO2Nhc2UibWVzc2FnZSI6ZSh2b2lkIDAhPT1hKSx0LnRhZygyLEUuTGVuZ3RoRGVsaW1pdGVkKS5ieXRlcyhhLnRvQmluYXJ5KG4pKX10LmpvaW4oKX1mdW5jdGlvbiBnZShlLHQsbixyKXtjb25zdCBpPUcobi5ULHIpO24uZGVsaW1pdGVkP2UudGFnKG4ubm8sRS5TdGFydEdyb3VwKS5yYXcoaS50b0JpbmFyeSh0KSkudGFnKG4ubm8sRS5FbmRHcm91cCk6ZS50YWcobi5ubyxFLkxlbmd0aERlbGltaXRlZCkuYnl0ZXMoaS50b0JpbmFyeSh0KSl9ZnVuY3Rpb24gYmUodCxuLHIsaSl7ZSh2b2lkIDAhPT1pKTtsZXQgYT1BKHllKG4pLDIpLG89YVswXSxzPWFbMV07dC50YWcocixvKVtzXShpKX1mdW5jdGlvbiB5ZShlKXtsZXQgdD1FLlZhcmludDtzd2l0Y2goZSl7Y2FzZSBULkJZVEVTOmNhc2UgVC5TVFJJTkc6dD1FLkxlbmd0aERlbGltaXRlZDticmVhaztjYXNlIFQuRE9VQkxFOmNhc2UgVC5GSVhFRDY0OmNhc2UgVC5TRklYRUQ2NDp0PUUuQml0NjQ7YnJlYWs7Y2FzZSBULkZJWEVEMzI6Y2FzZSBULlNGSVhFRDMyOmNhc2UgVC5GTE9BVDp0PUUuQml0MzJ9cmV0dXJuW3QsVFtlXS50b0xvd2VyQ2FzZSgpXX1mdW5jdGlvbiB2ZShlKXtpZih2b2lkIDA9PT1lKXJldHVybiBlO2lmKEooZSkpcmV0dXJuIGUuY2xvbmUoKTtpZihlIGluc3RhbmNlb2YgVWludDhBcnJheSl7Y29uc3QgdD1uZXcgVWludDhBcnJheShlLmJ5dGVMZW5ndGgpO3JldHVybiB0LnNldChlKSx0fXJldHVybiBlfWZ1bmN0aW9uIGtlKGUpe3JldHVybiBlIGluc3RhbmNlb2YgVWludDhBcnJheT9lOm5ldyBVaW50OEFycmF5KGUpfWNsYXNzIHdle2NvbnN0cnVjdG9yKGUsdCl7dGhpcy5fZmllbGRzPWUsdGhpcy5fbm9ybWFsaXplcj10fWZpbmRKc29uTmFtZShlKXtpZighdGhpcy5qc29uTmFtZXMpe2NvbnN0IGU9e307Zm9yKGNvbnN0IHQgb2YgdGhpcy5saXN0KCkpZVt0Lmpzb25OYW1lXT1lW3QubmFtZV09dDt0aGlzLmpzb25OYW1lcz1lfXJldHVybiB0aGlzLmpzb25OYW1lc1tlXX1maW5kKGUpe2lmKCF0aGlzLm51bWJlcnMpe2NvbnN0IGU9e307Zm9yKGNvbnN0IHQgb2YgdGhpcy5saXN0KCkpZVt0Lm5vXT10O3RoaXMubnVtYmVycz1lfXJldHVybiB0aGlzLm51bWJlcnNbZV19bGlzdCgpe3JldHVybiB0aGlzLmFsbHx8KHRoaXMuYWxsPXRoaXMuX25vcm1hbGl6ZXIodGhpcy5fZmllbGRzKSksdGhpcy5hbGx9YnlOdW1iZXIoKXtyZXR1cm4gdGhpcy5udW1iZXJzQXNjfHwodGhpcy5udW1iZXJzQXNjPXRoaXMubGlzdCgpLmNvbmNhdCgpLnNvcnQoKChlLHQpPT5lLm5vLXQubm8pKSksdGhpcy5udW1iZXJzQXNjfWJ5TWVtYmVyKCl7aWYoIXRoaXMubWVtYmVycyl7dGhpcy5tZW1iZXJzPVtdO2NvbnN0IGU9dGhpcy5tZW1iZXJzO2xldCB0O2Zvcihjb25zdCBuIG9mIHRoaXMubGlzdCgpKW4ub25lb2Y/bi5vbmVvZiE9PXQmJih0PW4ub25lb2YsZS5wdXNoKHQpKTplLnB1c2gobil9cmV0dXJuIHRoaXMubWVtYmVyc319ZnVuY3Rpb24gVGUoZSx0KXtjb25zdCBuPUVlKGUpO3JldHVybiB0P246QWUoQ2UobikpfWNvbnN0IFNlPUVlO2Z1bmN0aW9uIEVlKGUpe2xldCB0PSExO2NvbnN0IG49W107Zm9yKGxldCByPTA7cjxlLmxlbmd0aDtyKyspe2xldCBpPWUuY2hhckF0KHIpO3N3aXRjaChpKXtjYXNlIl8iOnQ9ITA7YnJlYWs7Y2FzZSIwIjpjYXNlIjEiOmNhc2UiMiI6Y2FzZSIzIjpjYXNlIjQiOmNhc2UiNSI6Y2FzZSI2IjpjYXNlIjciOmNhc2UiOCI6Y2FzZSI5IjpuLnB1c2goaSksdD0hMTticmVhaztkZWZhdWx0OnQmJih0PSExLGk9aS50b1VwcGVyQ2FzZSgpKSxuLnB1c2goaSl9fXJldHVybiBuLmpvaW4oIiIpfWNvbnN0IE5lPW5ldyBTZXQoWyJjb25zdHJ1Y3RvciIsInRvU3RyaW5nIiwidG9KU09OIiwidmFsdWVPZiJdKSxJZT1uZXcgU2V0KFsiZ2V0VHlwZSIsImNsb25lIiwiZXF1YWxzIiwiZnJvbUJpbmFyeSIsImZyb21Kc29uIiwiZnJvbUpzb25TdHJpbmciLCJ0b0JpbmFyeSIsInRvSnNvbiIsInRvSnNvblN0cmluZyIsInRvT2JqZWN0Il0pLE9lPWU9PiIiLmNvbmNhdChlLCIkIiksQ2U9ZT0+SWUuaGFzKGUpP09lKGUpOmUsQWU9ZT0+TmUuaGFzKGUpP09lKGUpOmU7Y2xhc3MgVWV7Y29uc3RydWN0b3IoZSl7dGhpcy5raW5kPSJvbmVvZiIsdGhpcy5yZXBlYXRlZD0hMSx0aGlzLnBhY2tlZD0hMSx0aGlzLm9wdD0hMSx0aGlzLnJlcT0hMSx0aGlzLmRlZmF1bHQ9dm9pZCAwLHRoaXMuZmllbGRzPVtdLHRoaXMubmFtZT1lLHRoaXMubG9jYWxOYW1lPVRlKGUsITEpfWFkZEZpZWxkKHQpe2UodC5vbmVvZj09PXRoaXMsImZpZWxkICIuY29uY2F0KHQubmFtZSwiIG5vdCBvbmUgb2YgIikuY29uY2F0KHRoaXMubmFtZSkpLHRoaXMuZmllbGRzLnB1c2godCl9ZmluZEZpZWxkKGUpe2lmKCF0aGlzLl9sb29rdXApe3RoaXMuX2xvb2t1cD1PYmplY3QuY3JlYXRlKG51bGwpO2ZvcihsZXQgZT0wO2U8dGhpcy5maWVsZHMubGVuZ3RoO2UrKyl0aGlzLl9sb29rdXBbdGhpcy5maWVsZHNbZV0ubG9jYWxOYW1lXT10aGlzLmZpZWxkc1tlXX1yZXR1cm4gdGhpcy5fbG9va3VwW2VdfX1jb25zdCBMZT0oRmU9ZT0+bmV3IHdlKGUsKGU9PmZ1bmN0aW9uKGUpe3ZhciB0LG4scixpLGEsbztjb25zdCBzPVtdO2xldCBjO2Zvcihjb25zdCB1IG9mImZ1bmN0aW9uIj09dHlwZW9mIGU/ZSgpOmUpe2NvbnN0IGU9dTtpZihlLmxvY2FsTmFtZT1UZSh1Lm5hbWUsdm9pZCAwIT09dS5vbmVvZiksZS5qc29uTmFtZT1udWxsIT09KHQ9dS5qc29uTmFtZSkmJnZvaWQgMCE9PXQ/dDpTZSh1Lm5hbWUpLGUucmVwZWF0ZWQ9bnVsbCE9PShuPXUucmVwZWF0ZWQpJiZ2b2lkIDAhPT1uJiZuLCJzY2FsYXIiPT11LmtpbmQmJihlLkw9bnVsbCE9PShyPXUuTCkmJnZvaWQgMCE9PXI/cjpTLkJJR0lOVCksZS5kZWxpbWl0ZWQ9bnVsbCE9PShpPXUuZGVsaW1pdGVkKSYmdm9pZCAwIT09aSYmaSxlLnJlcT1udWxsIT09KGE9dS5yZXEpJiZ2b2lkIDAhPT1hJiZhLGUub3B0PW51bGwhPT0obz11Lm9wdCkmJnZvaWQgMCE9PW8mJm8sdm9pZCAwPT09dS5wYWNrZWQmJihlLnBhY2tlZD0iZW51bSI9PXUua2luZHx8InNjYWxhciI9PXUua2luZCYmdS5UIT1ULkJZVEVTJiZ1LlQhPVQuU1RSSU5HKSx2b2lkIDAhPT11Lm9uZW9mKXtjb25zdCB0PSJzdHJpbmciPT10eXBlb2YgdS5vbmVvZj91Lm9uZW9mOnUub25lb2YubmFtZTtjJiZjLm5hbWU9PXR8fChjPW5ldyBVZSh0KSksZS5vbmVvZj1jLGMuYWRkRmllbGQoZSl9cy5wdXNoKGUpfXJldHVybiBzfShlKSkpLERlPWU9Pntmb3IoY29uc3QgdCBvZiBlLmdldFR5cGUoKS5maWVsZHMuYnlNZW1iZXIoKSl7aWYodC5vcHQpY29udGludWU7Y29uc3Qgbj10LmxvY2FsTmFtZSxyPWU7aWYodC5yZXBlYXRlZClyW25dPVtdO2Vsc2Ugc3dpdGNoKHQua2luZCl7Y2FzZSJvbmVvZiI6cltuXT17Y2FzZTp2b2lkIDB9O2JyZWFrO2Nhc2UiZW51bSI6cltuXT0wO2JyZWFrO2Nhc2UibWFwIjpyW25dPXt9O2JyZWFrO2Nhc2Uic2NhbGFyIjpyW25dPUkodC5ULHQuTCl9fX0se3N5bnRheDoicHJvdG8zIixqc29uOnttYWtlUmVhZE9wdGlvbnM6VyxtYWtlV3JpdGVPcHRpb25zOkgscmVhZE1lc3NhZ2UoZSx0LG4scil7aWYobnVsbD09dHx8QXJyYXkuaXNBcnJheSh0KXx8Im9iamVjdCIhPXR5cGVvZiB0KXRocm93IG5ldyBFcnJvcigiY2Fubm90IGRlY29kZSBtZXNzYWdlICIuY29uY2F0KGUudHlwZU5hbWUsIiBmcm9tIEpTT046ICIpLmNvbmNhdChRKHQpKSk7cj1udWxsIT1yP3I6bmV3IGU7Y29uc3QgaT1uZXcgTWFwLGE9bi50eXBlUmVnaXN0cnk7Zm9yKGNvbnN0IHMgb2YgT2JqZWN0LmVudHJpZXModCkpe3ZhciBvPUEocywyKTtjb25zdCB0PW9bMF0sYz1vWzFdLHU9ZS5maWVsZHMuZmluZEpzb25OYW1lKHQpO2lmKHUpe2lmKHUub25lb2Ype2lmKG51bGw9PT1jJiYic2NhbGFyIj09dS5raW5kKWNvbnRpbnVlO2NvbnN0IG49aS5nZXQodS5vbmVvZik7aWYodm9pZCAwIT09bil0aHJvdyBuZXcgRXJyb3IoImNhbm5vdCBkZWNvZGUgbWVzc2FnZSAiLmNvbmNhdChlLnR5cGVOYW1lLCcgZnJvbSBKU09OOiBtdWx0aXBsZSBrZXlzIGZvciBvbmVvZiAiJykuY29uY2F0KHUub25lb2YubmFtZSwnIiBwcmVzZW50OiAiJykuY29uY2F0KG4sJyIsICInKS5jb25jYXQodCwnIicpKTtpLnNldCh1Lm9uZW9mLHQpfXoocixjLHUsbixlKX1lbHNle2xldCBpPSExO2lmKChudWxsPT1hP3ZvaWQgMDphLmZpbmRFeHRlbnNpb24pJiZ0LnN0YXJ0c1dpdGgoIlsiKSYmdC5lbmRzV2l0aCgiXSIpKXtjb25zdCBvPWEuZmluZEV4dGVuc2lvbih0LnN1YnN0cmluZygxLHQubGVuZ3RoLTEpKTtpZihvJiZvLmV4dGVuZGVlLnR5cGVOYW1lPT1lLnR5cGVOYW1lKXtpPSEwO2NvbnN0IGU9QShGKG8pLDIpLHQ9ZVswXSxhPWVbMV07eih0LGMsby5maWVsZCxuLG8pLHgocixvLGEoKSxuKX19aWYoIWkmJiFuLmlnbm9yZVVua25vd25GaWVsZHMpdGhyb3cgbmV3IEVycm9yKCJjYW5ub3QgZGVjb2RlIG1lc3NhZ2UgIi5jb25jYXQoZS50eXBlTmFtZSwnIGZyb20gSlNPTjoga2V5ICInKS5jb25jYXQodCwnIiBpcyB1bmtub3duJykpfX1yZXR1cm4gcn0sd3JpdGVNZXNzYWdlKGUsdCl7Y29uc3Qgbj1lLmdldFR5cGUoKSxyPXt9O2xldCBpO3RyeXtmb3IoaSBvZiBuLmZpZWxkcy5ieU51bWJlcigpKXtpZighVihpLGUpKXtpZihpLnJlcSl0aHJvdyJyZXF1aXJlZCBmaWVsZCBub3Qgc2V0IjtpZighdC5lbWl0RGVmYXVsdFZhbHVlcyljb250aW51ZTtpZighdGUoaSkpY29udGludWV9Y29uc3Qgbj1uZShpLGkub25lb2Y/ZVtpLm9uZW9mLmxvY2FsTmFtZV0udmFsdWU6ZVtpLmxvY2FsTmFtZV0sdCk7dm9pZCAwIT09biYmKHJbdC51c2VQcm90b0ZpZWxkTmFtZT9pLm5hbWU6aS5qc29uTmFtZV09bil9Y29uc3QgYT10LnR5cGVSZWdpc3RyeTtpZihudWxsPT1hP3ZvaWQgMDphLmZpbmRFeHRlbnNpb25Gb3IpZm9yKGNvbnN0IGkgb2Ygbi5ydW50aW1lLmJpbi5saXN0VW5rbm93bkZpZWxkcyhlKSl7Y29uc3Qgbz1hLmZpbmRFeHRlbnNpb25Gb3Iobi50eXBlTmFtZSxpLm5vKTtpZihvJiZqKGUsbykpe2NvbnN0IG49UChlLG8sdCksaT1uZShvLmZpZWxkLG4sdCk7dm9pZCAwIT09aSYmKHJbby5maWVsZC5qc29uTmFtZV09aSl9fX1jYXRjaChlKXtjb25zdCB0PWk/ImNhbm5vdCBlbmNvZGUgZmllbGQgIi5jb25jYXQobi50eXBlTmFtZSwiLiIpLmNvbmNhdChpLm5hbWUsIiB0byBKU09OIik6ImNhbm5vdCBlbmNvZGUgbWVzc2FnZSAiLmNvbmNhdChuLnR5cGVOYW1lLCIgdG8gSlNPTiIpLHI9ZSBpbnN0YW5jZW9mIEVycm9yP2UubWVzc2FnZTpTdHJpbmcoZSk7dGhyb3cgbmV3IEVycm9yKHQrKHIubGVuZ3RoPjA/IjogIi5jb25jYXQocik6IiIpKX1yZXR1cm4gcn0scmVhZFNjYWxhcjooZSx0LG4pPT5aKGUsdCxudWxsIT1uP246Uy5CSUdJTlQsITApLHdyaXRlU2NhbGFyKGUsdCxuKXtpZih2b2lkIDAhPT10KXJldHVybiBufHxPKGUsdCk/aWUoZSx0KTp2b2lkIDB9LGRlYnVnOlF9LGJpbjp7bWFrZVJlYWRPcHRpb25zOmNlLG1ha2VXcml0ZU9wdGlvbnM6dWUsbGlzdFVua25vd25GaWVsZHMoZSl7dmFyIHQ7cmV0dXJuIG51bGwhPT0odD1lW2FlXSkmJnZvaWQgMCE9PXQ/dDpbXX0sZGlzY2FyZFVua25vd25GaWVsZHMoZSl7ZGVsZXRlIGVbYWVdfSx3cml0ZVVua25vd25GaWVsZHMoZSx0KXtjb25zdCBuPWVbYWVdO2lmKG4pZm9yKGNvbnN0IGUgb2Ygbil0LnRhZyhlLm5vLGUud2lyZVR5cGUpLnJhdyhlLmRhdGEpfSxvblVua25vd25GaWVsZChlLHQsbixyKXtjb25zdCBpPWU7QXJyYXkuaXNBcnJheShpW2FlXSl8fChpW2FlXT1bXSksaVthZV0ucHVzaCh7bm86dCx3aXJlVHlwZTpuLGRhdGE6cn0pfSxyZWFkTWVzc2FnZShlLHQsbixyLGkpe2NvbnN0IGE9ZS5nZXRUeXBlKCksbz1pP3QubGVuOnQucG9zK247bGV0IHMsYztmb3IoO3QucG9zPG87KXt2YXIgdT1BKHQudGFnKCksMik7aWYocz11WzBdLGM9dVsxXSwhMD09PWkmJmM9PUUuRW5kR3JvdXApYnJlYWs7Y29uc3Qgbj1hLmZpZWxkcy5maW5kKHMpO2lmKG4pbGUoZSx0LG4sYyxyKTtlbHNle2NvbnN0IG49dC5za2lwKGMscyk7ci5yZWFkVW5rbm93bkZpZWxkcyYmdGhpcy5vblVua25vd25GaWVsZChlLHMsYyxuKX19aWYoaSYmKGMhPUUuRW5kR3JvdXB8fHMhPT1uKSl0aHJvdyBuZXcgRXJyb3IoImludmFsaWQgZW5kIGdyb3VwIHRhZyIpfSxyZWFkRmllbGQ6bGUsd3JpdGVNZXNzYWdlKGUsdCxuKXtjb25zdCByPWUuZ2V0VHlwZSgpO2Zvcihjb25zdCBpIG9mIHIuZmllbGRzLmJ5TnVtYmVyKCkpaWYoVihpLGUpKXBlKGksaS5vbmVvZj9lW2kub25lb2YubG9jYWxOYW1lXS52YWx1ZTplW2kubG9jYWxOYW1lXSx0LG4pO2Vsc2UgaWYoaS5yZXEpdGhyb3cgbmV3IEVycm9yKCJjYW5ub3QgZW5jb2RlIGZpZWxkICIuY29uY2F0KHIudHlwZU5hbWUsIi4iKS5jb25jYXQoaS5uYW1lLCIgdG8gYmluYXJ5OiByZXF1aXJlZCBmaWVsZCBub3Qgc2V0IikpO3JldHVybiBuLndyaXRlVW5rbm93bkZpZWxkcyYmdGhpcy53cml0ZVVua25vd25GaWVsZHMoZSx0KSx0fSx3cml0ZUZpZWxkKGUsdCxuLHIpe3ZvaWQgMCE9PXQmJnBlKGUsdCxuLHIpfX0sdXRpbDpPYmplY3QuYXNzaWduKE9iamVjdC5hc3NpZ24oe30se3NldEVudW1UeXBlOm8saW5pdFBhcnRpYWwoZSx0KXtpZih2b2lkIDA9PT1lKXJldHVybjtjb25zdCBuPXQuZ2V0VHlwZSgpO2Zvcihjb25zdCBpIG9mIG4uZmllbGRzLmJ5TWVtYmVyKCkpe2NvbnN0IG49aS5sb2NhbE5hbWUsYT10LG89ZTtpZihudWxsIT1vW25dKXN3aXRjaChpLmtpbmQpe2Nhc2Uib25lb2YiOmNvbnN0IGU9b1tuXS5jYXNlO2lmKHZvaWQgMD09PWUpY29udGludWU7Y29uc3QgdD1pLmZpbmRGaWVsZChlKTtsZXQgcz1vW25dLnZhbHVlO3QmJiJtZXNzYWdlIj09dC5raW5kJiYhSihzLHQuVCk/cz1uZXcgdC5UKHMpOnQmJiJzY2FsYXIiPT09dC5raW5kJiZ0LlQ9PT1ULkJZVEVTJiYocz1rZShzKSksYVtuXT17Y2FzZTplLHZhbHVlOnN9O2JyZWFrO2Nhc2Uic2NhbGFyIjpjYXNlImVudW0iOmxldCBjPW9bbl07aS5UPT09VC5CWVRFUyYmKGM9aS5yZXBlYXRlZD9jLm1hcChrZSk6a2UoYykpLGFbbl09YzticmVhaztjYXNlIm1hcCI6c3dpdGNoKGkuVi5raW5kKXtjYXNlInNjYWxhciI6Y2FzZSJlbnVtIjppZihpLlYuVD09PVQuQllURVMpZm9yKGNvbnN0IGUgb2YgT2JqZWN0LmVudHJpZXMob1tuXSkpe3ZhciByPUEoZSwyKTtjb25zdCB0PXJbMF0saT1yWzFdO2Fbbl1bdF09a2UoaSl9ZWxzZSBPYmplY3QuYXNzaWduKGFbbl0sb1tuXSk7YnJlYWs7Y2FzZSJtZXNzYWdlIjpjb25zdCBlPWkuVi5UO2Zvcihjb25zdCB0IG9mIE9iamVjdC5rZXlzKG9bbl0pKXtsZXQgcj1vW25dW3RdO2UuZmllbGRXcmFwcGVyfHwocj1uZXcgZShyKSksYVtuXVt0XT1yfX1icmVhaztjYXNlIm1lc3NhZ2UiOmNvbnN0IHU9aS5UO2lmKGkucmVwZWF0ZWQpYVtuXT1vW25dLm1hcCgoZT0+SihlLHUpP2U6bmV3IHUoZSkpKTtlbHNle2NvbnN0IGU9b1tuXTt1LmZpZWxkV3JhcHBlcj8iZ29vZ2xlLnByb3RvYnVmLkJ5dGVzVmFsdWUiPT09dS50eXBlTmFtZT9hW25dPWtlKGUpOmFbbl09ZTphW25dPUooZSx1KT9lOm5ldyB1KGUpfX19fSxlcXVhbHM6KGUsdCxuKT0+dD09PW58fCEoIXR8fCFuKSYmZS5maWVsZHMuYnlNZW1iZXIoKS5ldmVyeSgoZT0+e2NvbnN0IHI9dFtlLmxvY2FsTmFtZV0saT1uW2UubG9jYWxOYW1lXTtpZihlLnJlcGVhdGVkKXtpZihyLmxlbmd0aCE9PWkubGVuZ3RoKXJldHVybiExO3N3aXRjaChlLmtpbmQpe2Nhc2UibWVzc2FnZSI6cmV0dXJuIHIuZXZlcnkoKCh0LG4pPT5lLlQuZXF1YWxzKHQsaVtuXSkpKTtjYXNlInNjYWxhciI6cmV0dXJuIHIuZXZlcnkoKCh0LG4pPT5OKGUuVCx0LGlbbl0pKSk7Y2FzZSJlbnVtIjpyZXR1cm4gci5ldmVyeSgoKGUsdCk9Pk4oVC5JTlQzMixlLGlbdF0pKSl9dGhyb3cgbmV3IEVycm9yKCJyZXBlYXRlZCBjYW5ub3QgY29udGFpbiAiLmNvbmNhdChlLmtpbmQpKX1zd2l0Y2goZS5raW5kKXtjYXNlIm1lc3NhZ2UiOmxldCB0PXIsbj1pO3JldHVybiBlLlQuZmllbGRXcmFwcGVyJiYodm9pZCAwPT09dHx8Sih0KXx8KHQ9ZS5ULmZpZWxkV3JhcHBlci53cmFwRmllbGQodCkpLHZvaWQgMD09PW58fEoobil8fChuPWUuVC5maWVsZFdyYXBwZXIud3JhcEZpZWxkKG4pKSksZS5ULmVxdWFscyh0LG4pO2Nhc2UiZW51bSI6cmV0dXJuIE4oVC5JTlQzMixyLGkpO2Nhc2Uic2NhbGFyIjpyZXR1cm4gTihlLlQscixpKTtjYXNlIm9uZW9mIjppZihyLmNhc2UhPT1pLmNhc2UpcmV0dXJuITE7Y29uc3QgYT1lLmZpbmRGaWVsZChyLmNhc2UpO2lmKHZvaWQgMD09PWEpcmV0dXJuITA7c3dpdGNoKGEua2luZCl7Y2FzZSJtZXNzYWdlIjpyZXR1cm4gYS5ULmVxdWFscyhyLnZhbHVlLGkudmFsdWUpO2Nhc2UiZW51bSI6cmV0dXJuIE4oVC5JTlQzMixyLnZhbHVlLGkudmFsdWUpO2Nhc2Uic2NhbGFyIjpyZXR1cm4gTihhLlQsci52YWx1ZSxpLnZhbHVlKX10aHJvdyBuZXcgRXJyb3IoIm9uZW9mIGNhbm5vdCBjb250YWluICIuY29uY2F0KGEua2luZCkpO2Nhc2UibWFwIjpjb25zdCBvPU9iamVjdC5rZXlzKHIpLmNvbmNhdChPYmplY3Qua2V5cyhpKSk7c3dpdGNoKGUuVi5raW5kKXtjYXNlIm1lc3NhZ2UiOmNvbnN0IHQ9ZS5WLlQ7cmV0dXJuIG8uZXZlcnkoKGU9PnQuZXF1YWxzKHJbZV0saVtlXSkpKTtjYXNlImVudW0iOnJldHVybiBvLmV2ZXJ5KChlPT5OKFQuSU5UMzIscltlXSxpW2VdKSkpO2Nhc2Uic2NhbGFyIjpjb25zdCBuPWUuVi5UO3JldHVybiBvLmV2ZXJ5KChlPT5OKG4scltlXSxpW2VdKSkpfX19KSksY2xvbmUoZSl7Y29uc3QgdD1lLmdldFR5cGUoKSxuPW5ldyB0LHI9bjtmb3IoY29uc3QgbiBvZiB0LmZpZWxkcy5ieU1lbWJlcigpKXtjb25zdCB0PWVbbi5sb2NhbE5hbWVdO2xldCBhO2lmKG4ucmVwZWF0ZWQpYT10Lm1hcCh2ZSk7ZWxzZSBpZigibWFwIj09bi5raW5kKXthPXJbbi5sb2NhbE5hbWVdO2Zvcihjb25zdCBlIG9mIE9iamVjdC5lbnRyaWVzKHQpKXt2YXIgaT1BKGUsMik7Y29uc3QgdD1pWzBdLG49aVsxXTthW3RdPXZlKG4pfX1lbHNlIGE9Im9uZW9mIj09bi5raW5kP24uZmluZEZpZWxkKHQuY2FzZSk/e2Nhc2U6dC5jYXNlLHZhbHVlOnZlKHQudmFsdWUpfTp7Y2FzZTp2b2lkIDB9OnZlKHQpO3Jbbi5sb2NhbE5hbWVdPWF9Zm9yKGNvbnN0IG4gb2YgdC5ydW50aW1lLmJpbi5saXN0VW5rbm93bkZpZWxkcyhlKSl0LnJ1bnRpbWUuYmluLm9uVW5rbm93bkZpZWxkKHIsbi5ubyxuLndpcmVUeXBlLG4uZGF0YSk7cmV0dXJuIG59fSkse25ld0ZpZWxkTGlzdDpGZSxpbml0RmllbGRzOkRlfSksbWFrZU1lc3NhZ2VUeXBlKGUsdCxuKXtyZXR1cm4gZnVuY3Rpb24oZSx0LG4scil7dmFyIGk7Y29uc3QgYT1udWxsIT09KGk9bnVsbD09cj92b2lkIDA6ci5sb2NhbE5hbWUpJiZ2b2lkIDAhPT1pP2k6dC5zdWJzdHJpbmcodC5sYXN0SW5kZXhPZigiLiIpKzEpLG89e1thXTpmdW5jdGlvbih0KXtlLnV0aWwuaW5pdEZpZWxkcyh0aGlzKSxlLnV0aWwuaW5pdFBhcnRpYWwodCx0aGlzKX19W2FdO3JldHVybiBPYmplY3Quc2V0UHJvdG90eXBlT2Yoby5wcm90b3R5cGUsbmV3IGwpLE9iamVjdC5hc3NpZ24obyx7cnVudGltZTplLHR5cGVOYW1lOnQsZmllbGRzOmUudXRpbC5uZXdGaWVsZExpc3QobiksZnJvbUJpbmFyeTooZSx0KT0+KG5ldyBvKS5mcm9tQmluYXJ5KGUsdCksZnJvbUpzb246KGUsdCk9PihuZXcgbykuZnJvbUpzb24oZSx0KSxmcm9tSnNvblN0cmluZzooZSx0KT0+KG5ldyBvKS5mcm9tSnNvblN0cmluZyhlLHQpLGVxdWFsczoodCxuKT0+ZS51dGlsLmVxdWFscyhvLHQsbil9KSxvfSh0aGlzLGUsdCxuKX0sbWFrZUVudW06YyxtYWtlRW51bVR5cGU6cyxnZXRFbnVtVHlwZTphLG1ha2VFeHRlbnNpb24oZSx0LG4pe3JldHVybiBmdW5jdGlvbihlLHQsbixyKXtsZXQgaTtyZXR1cm57dHlwZU5hbWU6dCxleHRlbmRlZTpuLGdldCBmaWVsZCgpe2lmKCFpKXtjb25zdCBuPSJmdW5jdGlvbiI9PXR5cGVvZiByP3IoKTpyO24ubmFtZT10LnNwbGl0KCIuIikucG9wKCksbi5qc29uTmFtZT0iWyIuY29uY2F0KHQsIl0iKSxpPWUudXRpbC5uZXdGaWVsZExpc3QoW25dKS5saXN0KClbMF19cmV0dXJuIGl9LHJ1bnRpbWU6ZX19KHRoaXMsZSx0LG4pfX0pO3ZhciBGZSxEZTtjb25zdCBSZT1MZS5tYWtlRW51bSgibGl2ZWtpdC5UcmFja1R5cGUiLFt7bm86MCxuYW1lOiJBVURJTyJ9LHtubzoxLG5hbWU6IlZJREVPIn0se25vOjIsbmFtZToiREFUQSJ9XSksQmU9TGUubWFrZUVudW0oImxpdmVraXQuVHJhY2tTb3VyY2UiLFt7bm86MCxuYW1lOiJVTktOT1dOIn0se25vOjEsbmFtZToiQ0FNRVJBIn0se25vOjIsbmFtZToiTUlDUk9QSE9ORSJ9LHtubzozLG5hbWU6IlNDUkVFTl9TSEFSRSJ9LHtubzo0LG5hbWU6IlNDUkVFTl9TSEFSRV9BVURJTyJ9XSksUGU9TGUubWFrZUVudW0oImxpdmVraXQuU3RyZWFtU3RhdGUiLFt7bm86MCxuYW1lOiJBQ1RJVkUifSx7bm86MSxuYW1lOiJQQVVTRUQifV0pO2Z1bmN0aW9uIHhlKGUsdCxuLHIpe3JldHVybiBuZXcobnx8KG49UHJvbWlzZSkpKChmdW5jdGlvbihpLGEpe2Z1bmN0aW9uIG8oZSl7dHJ5e2Moci5uZXh0KGUpKX1jYXRjaChlKXthKGUpfX1mdW5jdGlvbiBzKGUpe3RyeXtjKHIudGhyb3coZSkpfWNhdGNoKGUpe2EoZSl9fWZ1bmN0aW9uIGMoZSl7dmFyIHQ7ZS5kb25lP2koZS52YWx1ZSk6KHQ9ZS52YWx1ZSx0IGluc3RhbmNlb2Ygbj90Om5ldyBuKChmdW5jdGlvbihlKXtlKHQpfSkpKS50aGVuKG8scyl9Yygocj1yLmFwcGx5KGUsdHx8W10pKS5uZXh0KCkpfSkpfXZhciBqZSxNZTsiZnVuY3Rpb24iPT10eXBlb2YgU3VwcHJlc3NlZEVycm9yJiZTdXBwcmVzc2VkRXJyb3I7Y2xhc3MgVmUgZXh0ZW5kcyhNZT1Qcm9taXNlKXtjb25zdHJ1Y3RvcihlKXtzdXBlcihlKX1jYXRjaChlKXtyZXR1cm4gc3VwZXIuY2F0Y2goZSl9c3RhdGljIHJlamVjdChlKXtyZXR1cm4gc3VwZXIucmVqZWN0KGUpfXN0YXRpYyBhbGwoZSl7cmV0dXJuIHN1cGVyLmFsbChlKX1zdGF0aWMgcmFjZShlKXtyZXR1cm4gc3VwZXIucmFjZShlKX19amU9VmUsVmUucmVzb2x2ZT1lPT5SZWZsZWN0LmdldChNZSwicmVzb2x2ZSIsamUpLmNhbGwoamUsZSk7Y29uc3QgX2U9L3ZlcnNpb25cLyhcZCsoXC4/Xz9cZCspKykvaTtsZXQgSmU7ZnVuY3Rpb24gR2UoZSl7bGV0IHQ9IShhcmd1bWVudHMubGVuZ3RoPjEmJnZvaWQgMCE9PWFyZ3VtZW50c1sxXSl8fGFyZ3VtZW50c1sxXTtpZigidW5kZWZpbmVkIj09dHlwZW9mIG5hdmlnYXRvcilyZXR1cm47Y29uc3Qgbj1uYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7aWYodm9pZCAwPT09SmV8fHQpe2NvbnN0IGU9WGUuZmluZCgoZT0+ZS50ZXN0LnRlc3QobikpKTtKZT1udWxsPT1lP3ZvaWQgMDplLmRlc2NyaWJlKG4pfXJldHVybiBKZX1jb25zdCBYZT1be3Rlc3Q6L2ZpcmVmb3h8aWNld2Vhc2VsfGZ4aW9zL2ksZGVzY3JpYmU6ZT0+KHtuYW1lOiJGaXJlZm94Iix2ZXJzaW9uOnFlKC8oPzpmaXJlZm94fGljZXdlYXNlbHxmeGlvcylbXHMvXShcZCsoXC4/Xz9cZCspKykvaSxlKSxvczplLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoImZ4aW9zIik/ImlPUyI6dm9pZCAwLG9zVmVyc2lvbjpXZShlKX0pfSx7dGVzdDovY2hyb218Y3Jpb3N8Y3Jtby9pLGRlc2NyaWJlOmU9Pih7bmFtZToiQ2hyb21lIix2ZXJzaW9uOnFlKC8oPzpjaHJvbWV8Y2hyb21pdW18Y3Jpb3N8Y3JtbylcLyhcZCsoXC4/Xz9cZCspKykvaSxlKSxvczplLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoImNyaW9zIik/ImlPUyI6dm9pZCAwLG9zVmVyc2lvbjpXZShlKX0pfSx7dGVzdDovc2FmYXJpfGFwcGxld2Via2l0L2ksZGVzY3JpYmU6ZT0+KHtuYW1lOiJTYWZhcmkiLHZlcnNpb246cWUoX2UsZSksb3M6ZS5pbmNsdWRlcygibW9iaWxlLyIpPyJpT1MiOiJtYWNPUyIsb3NWZXJzaW9uOldlKGUpfSl9XTtmdW5jdGlvbiBxZShlLHQpe2xldCBuPWFyZ3VtZW50cy5sZW5ndGg+MiYmdm9pZCAwIT09YXJndW1lbnRzWzJdP2FyZ3VtZW50c1syXToxO2NvbnN0IHI9dC5tYXRjaChlKTtyZXR1cm4gciYmci5sZW5ndGg+PW4mJnJbbl18fCIifWZ1bmN0aW9uIFdlKGUpe3JldHVybiBlLmluY2x1ZGVzKCJtYWMgb3MiKT9xZSgvXCguKz8oXGQrX1xkKyg6P19cZCspPykvLGUsMSkucmVwbGFjZSgvXy9nLCIuIik6dm9pZCAwfXZhciBIZSxZZSxLZTshZnVuY3Rpb24oZSl7ZVtlLk5vdEFsbG93ZWQ9MF09Ik5vdEFsbG93ZWQiLGVbZS5TZXJ2ZXJVbnJlYWNoYWJsZT0xXT0iU2VydmVyVW5yZWFjaGFibGUiLGVbZS5JbnRlcm5hbEVycm9yPTJdPSJJbnRlcm5hbEVycm9yIixlW2UuQ2FuY2VsbGVkPTNdPSJDYW5jZWxsZWQiLGVbZS5MZWF2ZVJlcXVlc3Q9NF09IkxlYXZlUmVxdWVzdCIsZVtlLlRpbWVvdXQ9NV09IlRpbWVvdXQiLGVbZS5XZWJTb2NrZXQ9Nl09IldlYlNvY2tldCIsZVtlLlNlcnZpY2VOb3RGb3VuZD03XT0iU2VydmljZU5vdEZvdW5kIn0oSGV8fChIZT17fSkpLGZ1bmN0aW9uKGUpe2VbZS5BbHJlYWR5T3BlbmVkPTBdPSJBbHJlYWR5T3BlbmVkIixlW2UuQWJub3JtYWxFbmQ9MV09IkFibm9ybWFsRW5kIixlW2UuRGVjb2RlRmFpbGVkPTJdPSJEZWNvZGVGYWlsZWQiLGVbZS5MZW5ndGhFeGNlZWRlZD0zXT0iTGVuZ3RoRXhjZWVkZWQiLGVbZS5JbmNvbXBsZXRlPTRdPSJJbmNvbXBsZXRlIixlW2UuSGFuZGxlckFscmVhZHlSZWdpc3RlcmVkPTddPSJIYW5kbGVyQWxyZWFkeVJlZ2lzdGVyZWQiLGVbZS5FbmNyeXB0aW9uVHlwZU1pc21hdGNoPThdPSJFbmNyeXB0aW9uVHlwZU1pc21hdGNoIn0oWWV8fChZZT17fSkpLGZ1bmN0aW9uKGUpe2UuUGVybWlzc2lvbkRlbmllZD0iUGVybWlzc2lvbkRlbmllZCIsZS5Ob3RGb3VuZD0iTm90Rm91bmQiLGUuRGV2aWNlSW5Vc2U9IkRldmljZUluVXNlIixlLk90aGVyPSJPdGhlciJ9KEtlfHwoS2U9e30pKSxmdW5jdGlvbihlKXtlLmdldEZhaWx1cmU9ZnVuY3Rpb24odCl7aWYodCYmIm5hbWUiaW4gdClyZXR1cm4iTm90Rm91bmRFcnJvciI9PT10Lm5hbWV8fCJEZXZpY2VzTm90Rm91bmRFcnJvciI9PT10Lm5hbWU/ZS5Ob3RGb3VuZDoiTm90QWxsb3dlZEVycm9yIj09PXQubmFtZXx8IlBlcm1pc3Npb25EZW5pZWRFcnJvciI9PT10Lm5hbWU/ZS5QZXJtaXNzaW9uRGVuaWVkOiJOb3RSZWFkYWJsZUVycm9yIj09PXQubmFtZXx8IlRyYWNrU3RhcnRFcnJvciI9PT10Lm5hbWU/ZS5EZXZpY2VJblVzZTplLk90aGVyfX0oS2V8fChLZT17fSkpO3ZhciBRZSx6ZT17ZXhwb3J0czp7fX07dmFyICRlLFplPWZ1bmN0aW9uKCl7aWYoUWUpcmV0dXJuIHplLmV4cG9ydHM7UWU9MTt2YXIgZSx0PSJvYmplY3QiPT10eXBlb2YgUmVmbGVjdD9SZWZsZWN0Om51bGwsbj10JiYiZnVuY3Rpb24iPT10eXBlb2YgdC5hcHBseT90LmFwcGx5OmZ1bmN0aW9uKGUsdCxuKXtyZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwoZSx0LG4pfTtlPXQmJiJmdW5jdGlvbiI9PXR5cGVvZiB0Lm93bktleXM/dC5vd25LZXlzOk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM/ZnVuY3Rpb24oZSl7cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGUpLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGUpKX06ZnVuY3Rpb24oZSl7cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGUpfTt2YXIgcj1OdW1iZXIuaXNOYU58fGZ1bmN0aW9uKGUpe3JldHVybiBlIT1lfTtmdW5jdGlvbiBpKCl7aS5pbml0LmNhbGwodGhpcyl9emUuZXhwb3J0cz1pLHplLmV4cG9ydHMub25jZT1mdW5jdGlvbihlLHQpe3JldHVybiBuZXcgUHJvbWlzZSgoZnVuY3Rpb24obixyKXtmdW5jdGlvbiBpKG4pe2UucmVtb3ZlTGlzdGVuZXIodCxhKSxyKG4pfWZ1bmN0aW9uIGEoKXsiZnVuY3Rpb24iPT10eXBlb2YgZS5yZW1vdmVMaXN0ZW5lciYmZS5yZW1vdmVMaXN0ZW5lcigiZXJyb3IiLGkpLG4oW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKX1wKGUsdCxhLHtvbmNlOiEwfSksImVycm9yIiE9PXQmJmZ1bmN0aW9uKGUsdCxuKXsiZnVuY3Rpb24iPT10eXBlb2YgZS5vbiYmcChlLCJlcnJvciIsdCxuKX0oZSxpLHtvbmNlOiEwfSl9KSl9LGkuRXZlbnRFbWl0dGVyPWksaS5wcm90b3R5cGUuX2V2ZW50cz12b2lkIDAsaS5wcm90b3R5cGUuX2V2ZW50c0NvdW50PTAsaS5wcm90b3R5cGUuX21heExpc3RlbmVycz12b2lkIDA7dmFyIGE9MTA7ZnVuY3Rpb24gbyhlKXtpZigiZnVuY3Rpb24iIT10eXBlb2YgZSl0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgImxpc3RlbmVyIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRnVuY3Rpb24uIFJlY2VpdmVkIHR5cGUgJyt0eXBlb2YgZSl9ZnVuY3Rpb24gcyhlKXtyZXR1cm4gdm9pZCAwPT09ZS5fbWF4TGlzdGVuZXJzP2kuZGVmYXVsdE1heExpc3RlbmVyczplLl9tYXhMaXN0ZW5lcnN9ZnVuY3Rpb24gYyhlLHQsbixyKXt2YXIgaSxhLGMsdTtpZihvKG4pLHZvaWQgMD09PShhPWUuX2V2ZW50cyk/KGE9ZS5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCksZS5fZXZlbnRzQ291bnQ9MCk6KHZvaWQgMCE9PWEubmV3TGlzdGVuZXImJihlLmVtaXQoIm5ld0xpc3RlbmVyIix0LG4ubGlzdGVuZXI/bi5saXN0ZW5lcjpuKSxhPWUuX2V2ZW50cyksYz1hW3RdKSx2b2lkIDA9PT1jKWM9YVt0XT1uLCsrZS5fZXZlbnRzQ291bnQ7ZWxzZSBpZigiZnVuY3Rpb24iPT10eXBlb2YgYz9jPWFbdF09cj9bbixjXTpbYyxuXTpyP2MudW5zaGlmdChuKTpjLnB1c2gobiksKGk9cyhlKSk+MCYmYy5sZW5ndGg+aSYmIWMud2FybmVkKXtjLndhcm5lZD0hMDt2YXIgbD1uZXcgRXJyb3IoIlBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgbGVhayBkZXRlY3RlZC4gIitjLmxlbmd0aCsiICIrU3RyaW5nKHQpKyIgbGlzdGVuZXJzIGFkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdCIpO2wubmFtZT0iTWF4TGlzdGVuZXJzRXhjZWVkZWRXYXJuaW5nIixsLmVtaXR0ZXI9ZSxsLnR5cGU9dCxsLmNvdW50PWMubGVuZ3RoLHU9bCxjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2Fybih1KX1yZXR1cm4gZX1mdW5jdGlvbiB1KCl7aWYoIXRoaXMuZmlyZWQpcmV0dXJuIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSx0aGlzLndyYXBGbiksdGhpcy5maXJlZD0hMCwwPT09YXJndW1lbnRzLmxlbmd0aD90aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpOnRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsYXJndW1lbnRzKX1mdW5jdGlvbiBsKGUsdCxuKXt2YXIgcj17ZmlyZWQ6ITEsd3JhcEZuOnZvaWQgMCx0YXJnZXQ6ZSx0eXBlOnQsbGlzdGVuZXI6bn0saT11LmJpbmQocik7cmV0dXJuIGkubGlzdGVuZXI9bixyLndyYXBGbj1pLGl9ZnVuY3Rpb24gZChlLHQsbil7dmFyIHI9ZS5fZXZlbnRzO2lmKHZvaWQgMD09PXIpcmV0dXJuW107dmFyIGk9clt0XTtyZXR1cm4gdm9pZCAwPT09aT9bXToiZnVuY3Rpb24iPT10eXBlb2YgaT9uP1tpLmxpc3RlbmVyfHxpXTpbaV06bj9mdW5jdGlvbihlKXtmb3IodmFyIHQ9bmV3IEFycmF5KGUubGVuZ3RoKSxuPTA7bjx0Lmxlbmd0aDsrK24pdFtuXT1lW25dLmxpc3RlbmVyfHxlW25dO3JldHVybiB0fShpKTpoKGksaS5sZW5ndGgpfWZ1bmN0aW9uIGYoZSl7dmFyIHQ9dGhpcy5fZXZlbnRzO2lmKHZvaWQgMCE9PXQpe3ZhciBuPXRbZV07aWYoImZ1bmN0aW9uIj09dHlwZW9mIG4pcmV0dXJuIDE7aWYodm9pZCAwIT09bilyZXR1cm4gbi5sZW5ndGh9cmV0dXJuIDB9ZnVuY3Rpb24gaChlLHQpe2Zvcih2YXIgbj1uZXcgQXJyYXkodCkscj0wO3I8dDsrK3IpbltyXT1lW3JdO3JldHVybiBufWZ1bmN0aW9uIHAoZSx0LG4scil7aWYoImZ1bmN0aW9uIj09dHlwZW9mIGUub24pci5vbmNlP2Uub25jZSh0LG4pOmUub24odCxuKTtlbHNle2lmKCJmdW5jdGlvbiIhPXR5cGVvZiBlLmFkZEV2ZW50TGlzdGVuZXIpdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlICJlbWl0dGVyIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRXZlbnRFbWl0dGVyLiBSZWNlaXZlZCB0eXBlICcrdHlwZW9mIGUpO2UuYWRkRXZlbnRMaXN0ZW5lcih0LChmdW5jdGlvbiBpKGEpe3Iub25jZSYmZS5yZW1vdmVFdmVudExpc3RlbmVyKHQsaSksbihhKX0pKX19cmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpLCJkZWZhdWx0TWF4TGlzdGVuZXJzIix7ZW51bWVyYWJsZTohMCxnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gYX0sc2V0OmZ1bmN0aW9uKGUpe2lmKCJudW1iZXIiIT10eXBlb2YgZXx8ZTwwfHxyKGUpKXRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgb2YgImRlZmF1bHRNYXhMaXN0ZW5lcnMiIGlzIG91dCBvZiByYW5nZS4gSXQgbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBudW1iZXIuIFJlY2VpdmVkICcrZSsiLiIpO2E9ZX19KSxpLmluaXQ9ZnVuY3Rpb24oKXt2b2lkIDAhPT10aGlzLl9ldmVudHMmJnRoaXMuX2V2ZW50cyE9PU9iamVjdC5nZXRQcm90b3R5cGVPZih0aGlzKS5fZXZlbnRzfHwodGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCksdGhpcy5fZXZlbnRzQ291bnQ9MCksdGhpcy5fbWF4TGlzdGVuZXJzPXRoaXMuX21heExpc3RlbmVyc3x8dm9pZCAwfSxpLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnM9ZnVuY3Rpb24oZSl7aWYoIm51bWJlciIhPXR5cGVvZiBlfHxlPDB8fHIoZSkpdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBvZiAibiIgaXMgb3V0IG9mIHJhbmdlLiBJdCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIG51bWJlci4gUmVjZWl2ZWQgJytlKyIuIik7cmV0dXJuIHRoaXMuX21heExpc3RlbmVycz1lLHRoaXN9LGkucHJvdG90eXBlLmdldE1heExpc3RlbmVycz1mdW5jdGlvbigpe3JldHVybiBzKHRoaXMpfSxpLnByb3RvdHlwZS5lbWl0PWZ1bmN0aW9uKGUpe2Zvcih2YXIgdD1bXSxyPTE7cjxhcmd1bWVudHMubGVuZ3RoO3IrKyl0LnB1c2goYXJndW1lbnRzW3JdKTt2YXIgaT0iZXJyb3IiPT09ZSxhPXRoaXMuX2V2ZW50cztpZih2b2lkIDAhPT1hKWk9aSYmdm9pZCAwPT09YS5lcnJvcjtlbHNlIGlmKCFpKXJldHVybiExO2lmKGkpe3ZhciBvO2lmKHQubGVuZ3RoPjAmJihvPXRbMF0pLG8gaW5zdGFuY2VvZiBFcnJvcil0aHJvdyBvO3ZhciBzPW5ldyBFcnJvcigiVW5oYW5kbGVkIGVycm9yLiIrKG8/IiAoIitvLm1lc3NhZ2UrIikiOiIiKSk7dGhyb3cgcy5jb250ZXh0PW8sc312YXIgYz1hW2VdO2lmKHZvaWQgMD09PWMpcmV0dXJuITE7aWYoImZ1bmN0aW9uIj09dHlwZW9mIGMpbihjLHRoaXMsdCk7ZWxzZXt2YXIgdT1jLmxlbmd0aCxsPWgoYyx1KTtmb3Iocj0wO3I8dTsrK3IpbihsW3JdLHRoaXMsdCl9cmV0dXJuITB9LGkucHJvdG90eXBlLmFkZExpc3RlbmVyPWZ1bmN0aW9uKGUsdCl7cmV0dXJuIGModGhpcyxlLHQsITEpfSxpLnByb3RvdHlwZS5vbj1pLnByb3RvdHlwZS5hZGRMaXN0ZW5lcixpLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXI9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gYyh0aGlzLGUsdCwhMCl9LGkucHJvdG90eXBlLm9uY2U9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gbyh0KSx0aGlzLm9uKGUsbCh0aGlzLGUsdCkpLHRoaXN9LGkucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXI9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gbyh0KSx0aGlzLnByZXBlbmRMaXN0ZW5lcihlLGwodGhpcyxlLHQpKSx0aGlzfSxpLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcj1mdW5jdGlvbihlLHQpe3ZhciBuLHIsaSxhLHM7aWYobyh0KSx2b2lkIDA9PT0ocj10aGlzLl9ldmVudHMpKXJldHVybiB0aGlzO2lmKHZvaWQgMD09PShuPXJbZV0pKXJldHVybiB0aGlzO2lmKG49PT10fHxuLmxpc3RlbmVyPT09dCkwPT09LS10aGlzLl9ldmVudHNDb3VudD90aGlzLl9ldmVudHM9T2JqZWN0LmNyZWF0ZShudWxsKTooZGVsZXRlIHJbZV0sci5yZW1vdmVMaXN0ZW5lciYmdGhpcy5lbWl0KCJyZW1vdmVMaXN0ZW5lciIsZSxuLmxpc3RlbmVyfHx0KSk7ZWxzZSBpZigiZnVuY3Rpb24iIT10eXBlb2Ygbil7Zm9yKGk9LTEsYT1uLmxlbmd0aC0xO2E+PTA7YS0tKWlmKG5bYV09PT10fHxuW2FdLmxpc3RlbmVyPT09dCl7cz1uW2FdLmxpc3RlbmVyLGk9YTticmVha31pZihpPDApcmV0dXJuIHRoaXM7MD09PWk/bi5zaGlmdCgpOmZ1bmN0aW9uKGUsdCl7Zm9yKDt0KzE8ZS5sZW5ndGg7dCsrKWVbdF09ZVt0KzFdO2UucG9wKCl9KG4saSksMT09PW4ubGVuZ3RoJiYocltlXT1uWzBdKSx2b2lkIDAhPT1yLnJlbW92ZUxpc3RlbmVyJiZ0aGlzLmVtaXQoInJlbW92ZUxpc3RlbmVyIixlLHN8fHQpfXJldHVybiB0aGlzfSxpLnByb3RvdHlwZS5vZmY9aS5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIsaS5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzPWZ1bmN0aW9uKGUpe3ZhciB0LG4scjtpZih2b2lkIDA9PT0obj10aGlzLl9ldmVudHMpKXJldHVybiB0aGlzO2lmKHZvaWQgMD09PW4ucmVtb3ZlTGlzdGVuZXIpcmV0dXJuIDA9PT1hcmd1bWVudHMubGVuZ3RoPyh0aGlzLl9ldmVudHM9T2JqZWN0LmNyZWF0ZShudWxsKSx0aGlzLl9ldmVudHNDb3VudD0wKTp2b2lkIDAhPT1uW2VdJiYoMD09PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCk6ZGVsZXRlIG5bZV0pLHRoaXM7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpe3ZhciBpLGE9T2JqZWN0LmtleXMobik7Zm9yKHI9MDtyPGEubGVuZ3RoOysrcikicmVtb3ZlTGlzdGVuZXIiIT09KGk9YVtyXSkmJnRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGkpO3JldHVybiB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygicmVtb3ZlTGlzdGVuZXIiKSx0aGlzLl9ldmVudHM9T2JqZWN0LmNyZWF0ZShudWxsKSx0aGlzLl9ldmVudHNDb3VudD0wLHRoaXN9aWYoImZ1bmN0aW9uIj09dHlwZW9mKHQ9bltlXSkpdGhpcy5yZW1vdmVMaXN0ZW5lcihlLHQpO2Vsc2UgaWYodm9pZCAwIT09dClmb3Iocj10Lmxlbmd0aC0xO3I+PTA7ci0tKXRoaXMucmVtb3ZlTGlzdGVuZXIoZSx0W3JdKTtyZXR1cm4gdGhpc30saS5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uKGUpe3JldHVybiBkKHRoaXMsZSwhMCl9LGkucHJvdG90eXBlLnJhd0xpc3RlbmVycz1mdW5jdGlvbihlKXtyZXR1cm4gZCh0aGlzLGUsITEpfSxpLmxpc3RlbmVyQ291bnQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4iZnVuY3Rpb24iPT10eXBlb2YgZS5saXN0ZW5lckNvdW50P2UubGlzdGVuZXJDb3VudCh0KTpmLmNhbGwoZSx0KX0saS5wcm90b3R5cGUubGlzdGVuZXJDb3VudD1mLGkucHJvdG90eXBlLmV2ZW50TmFtZXM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZXZlbnRzQ291bnQ+MD9lKHRoaXMuX2V2ZW50cyk6W119LHplLmV4cG9ydHN9KCksZXQ9e2V4cG9ydHM6e319O3ZhciB0dCxudCxydCxpdCxhdCxvdD0oJGV8fCgkZT0xLG50PWV0LmV4cG9ydHMscnQ9ZnVuY3Rpb24oKXt2YXIgZT1mdW5jdGlvbigpe30sdD0idW5kZWZpbmVkIixuPXR5cGVvZiB3aW5kb3chPT10JiZ0eXBlb2Ygd2luZG93Lm5hdmlnYXRvciE9PXQmJi9UcmlkZW50XC98TVNJRSAvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpLHI9WyJ0cmFjZSIsImRlYnVnIiwiaW5mbyIsIndhcm4iLCJlcnJvciJdLGk9e30sYT1udWxsO2Z1bmN0aW9uIG8oZSx0KXt2YXIgbj1lW3RdO2lmKCJmdW5jdGlvbiI9PXR5cGVvZiBuLmJpbmQpcmV0dXJuIG4uYmluZChlKTt0cnl7cmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwobixlKX1jYXRjaCh0KXtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KG4sW2UsYXJndW1lbnRzXSl9fX1mdW5jdGlvbiBzKCl7Y29uc29sZS5sb2cmJihjb25zb2xlLmxvZy5hcHBseT9jb25zb2xlLmxvZy5hcHBseShjb25zb2xlLGFyZ3VtZW50cyk6RnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KGNvbnNvbGUubG9nLFtjb25zb2xlLGFyZ3VtZW50c10pKSxjb25zb2xlLnRyYWNlJiZjb25zb2xlLnRyYWNlKCl9ZnVuY3Rpb24gYygpe2Zvcih2YXIgbj10aGlzLmdldExldmVsKCksaT0wO2k8ci5sZW5ndGg7aSsrKXt2YXIgYT1yW2ldO3RoaXNbYV09aTxuP2U6dGhpcy5tZXRob2RGYWN0b3J5KGEsbix0aGlzLm5hbWUpfWlmKHRoaXMubG9nPXRoaXMuZGVidWcsdHlwZW9mIGNvbnNvbGU9PT10JiZuPHRoaXMubGV2ZWxzLlNJTEVOVClyZXR1cm4iTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmcifWZ1bmN0aW9uIHUoZSl7cmV0dXJuIGZ1bmN0aW9uKCl7dHlwZW9mIGNvbnNvbGUhPT10JiYoYy5jYWxsKHRoaXMpLHRoaXNbZV0uYXBwbHkodGhpcyxhcmd1bWVudHMpKX19ZnVuY3Rpb24gbChyLGksYSl7cmV0dXJuIGZ1bmN0aW9uKHIpe3JldHVybiJkZWJ1ZyI9PT1yJiYocj0ibG9nIiksdHlwZW9mIGNvbnNvbGUhPT10JiYoInRyYWNlIj09PXImJm4/czp2b2lkIDAhPT1jb25zb2xlW3JdP28oY29uc29sZSxyKTp2b2lkIDAhPT1jb25zb2xlLmxvZz9vKGNvbnNvbGUsImxvZyIpOmUpfShyKXx8dS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9ZnVuY3Rpb24gZChlLG4pe3ZhciBvLHMsdSxkPXRoaXMsZj0ibG9nbGV2ZWwiO2Z1bmN0aW9uIGgoKXt2YXIgZTtpZih0eXBlb2Ygd2luZG93IT09dCYmZil7dHJ5e2U9d2luZG93LmxvY2FsU3RvcmFnZVtmXX1jYXRjaChlKXt9aWYodHlwZW9mIGU9PT10KXRyeXt2YXIgbj13aW5kb3cuZG9jdW1lbnQuY29va2llLHI9ZW5jb2RlVVJJQ29tcG9uZW50KGYpLGk9bi5pbmRleE9mKHIrIj0iKTstMSE9PWkmJihlPS9eKFteO10rKS8uZXhlYyhuLnNsaWNlKGkrci5sZW5ndGgrMSkpWzFdKX1jYXRjaChlKXt9cmV0dXJuIHZvaWQgMD09PWQubGV2ZWxzW2VdJiYoZT12b2lkIDApLGV9fWZ1bmN0aW9uIHAoZSl7dmFyIHQ9ZTtpZigic3RyaW5nIj09dHlwZW9mIHQmJnZvaWQgMCE9PWQubGV2ZWxzW3QudG9VcHBlckNhc2UoKV0mJih0PWQubGV2ZWxzW3QudG9VcHBlckNhc2UoKV0pLCJudW1iZXIiPT10eXBlb2YgdCYmdD49MCYmdDw9ZC5sZXZlbHMuU0lMRU5UKXJldHVybiB0O3Rocm93IG5ldyBUeXBlRXJyb3IoImxvZy5zZXRMZXZlbCgpIGNhbGxlZCB3aXRoIGludmFsaWQgbGV2ZWw6ICIrZSl9InN0cmluZyI9PXR5cGVvZiBlP2YrPSI6IitlOiJzeW1ib2wiPT10eXBlb2YgZSYmKGY9dm9pZCAwKSxkLm5hbWU9ZSxkLmxldmVscz17VFJBQ0U6MCxERUJVRzoxLElORk86MixXQVJOOjMsRVJST1I6NCxTSUxFTlQ6NX0sZC5tZXRob2RGYWN0b3J5PW58fGwsZC5nZXRMZXZlbD1mdW5jdGlvbigpe3JldHVybiBudWxsIT11P3U6bnVsbCE9cz9zOm99LGQuc2V0TGV2ZWw9ZnVuY3Rpb24oZSxuKXtyZXR1cm4gdT1wKGUpLCExIT09biYmZnVuY3Rpb24oZSl7dmFyIG49KHJbZV18fCJzaWxlbnQiKS50b1VwcGVyQ2FzZSgpO2lmKHR5cGVvZiB3aW5kb3chPT10JiZmKXt0cnl7cmV0dXJuIHZvaWQod2luZG93LmxvY2FsU3RvcmFnZVtmXT1uKX1jYXRjaChlKXt9dHJ5e3dpbmRvdy5kb2N1bWVudC5jb29raWU9ZW5jb2RlVVJJQ29tcG9uZW50KGYpKyI9IituKyI7In1jYXRjaChlKXt9fX0odSksYy5jYWxsKGQpfSxkLnNldERlZmF1bHRMZXZlbD1mdW5jdGlvbihlKXtzPXAoZSksaCgpfHxkLnNldExldmVsKGUsITEpfSxkLnJlc2V0TGV2ZWw9ZnVuY3Rpb24oKXt1PW51bGwsZnVuY3Rpb24oKXtpZih0eXBlb2Ygd2luZG93IT09dCYmZil7dHJ5e3dpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShmKX1jYXRjaChlKXt9dHJ5e3dpbmRvdy5kb2N1bWVudC5jb29raWU9ZW5jb2RlVVJJQ29tcG9uZW50KGYpKyI9OyBleHBpcmVzPVRodSwgMDEgSmFuIDE5NzAgMDA6MDA6MDAgVVRDIn1jYXRjaChlKXt9fX0oKSxjLmNhbGwoZCl9LGQuZW5hYmxlQWxsPWZ1bmN0aW9uKGUpe2Quc2V0TGV2ZWwoZC5sZXZlbHMuVFJBQ0UsZSl9LGQuZGlzYWJsZUFsbD1mdW5jdGlvbihlKXtkLnNldExldmVsKGQubGV2ZWxzLlNJTEVOVCxlKX0sZC5yZWJ1aWxkPWZ1bmN0aW9uKCl7aWYoYSE9PWQmJihvPXAoYS5nZXRMZXZlbCgpKSksYy5jYWxsKGQpLGE9PT1kKWZvcih2YXIgZSBpbiBpKWlbZV0ucmVidWlsZCgpfSxvPXAoYT9hLmdldExldmVsKCk6IldBUk4iKTt2YXIgbT1oKCk7bnVsbCE9bSYmKHU9cChtKSksYy5jYWxsKGQpfShhPW5ldyBkKS5nZXRMb2dnZXI9ZnVuY3Rpb24oZSl7aWYoInN5bWJvbCIhPXR5cGVvZiBlJiYic3RyaW5nIiE9dHlwZW9mIGV8fCIiPT09ZSl0aHJvdyBuZXcgVHlwZUVycm9yKCJZb3UgbXVzdCBzdXBwbHkgYSBuYW1lIHdoZW4gY3JlYXRpbmcgYSBsb2dnZXIuIik7dmFyIHQ9aVtlXTtyZXR1cm4gdHx8KHQ9aVtlXT1uZXcgZChlLGEubWV0aG9kRmFjdG9yeSkpLHR9O3ZhciBmPXR5cGVvZiB3aW5kb3chPT10P3dpbmRvdy5sb2c6dm9pZCAwO3JldHVybiBhLm5vQ29uZmxpY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdHlwZW9mIHdpbmRvdyE9PXQmJndpbmRvdy5sb2c9PT1hJiYod2luZG93LmxvZz1mKSxhfSxhLmdldExvZ2dlcnM9ZnVuY3Rpb24oKXtyZXR1cm4gaX0sYS5kZWZhdWx0PWEsYX0sKHR0PWV0KS5leHBvcnRzP3R0LmV4cG9ydHM9cnQoKTpudC5sb2c9cnQoKSksZXQuZXhwb3J0cyk7IWZ1bmN0aW9uKGUpe2VbZS50cmFjZT0wXT0idHJhY2UiLGVbZS5kZWJ1Zz0xXT0iZGVidWciLGVbZS5pbmZvPTJdPSJpbmZvIixlW2Uud2Fybj0zXT0id2FybiIsZVtlLmVycm9yPTRdPSJlcnJvciIsZVtlLnNpbGVudD01XT0ic2lsZW50In0oaXR8fChpdD17fSkpLGZ1bmN0aW9uKGUpe2UuRGVmYXVsdD0ibGl2ZWtpdCIsZS5Sb29tPSJsaXZla2l0LXJvb20iLGUuVG9rZW5Tb3VyY2U9ImxpdmVraXQtdG9rZW4tc291cmNlIixlLlBhcnRpY2lwYW50PSJsaXZla2l0LXBhcnRpY2lwYW50IixlLlRyYWNrPSJsaXZla2l0LXRyYWNrIixlLlB1YmxpY2F0aW9uPSJsaXZla2l0LXRyYWNrLXB1YmxpY2F0aW9uIixlLkVuZ2luZT0ibGl2ZWtpdC1lbmdpbmUiLGUuU2lnbmFsPSJsaXZla2l0LXNpZ25hbCIsZS5QQ01hbmFnZXI9ImxpdmVraXQtcGMtbWFuYWdlciIsZS5QQ1RyYW5zcG9ydD0ibGl2ZWtpdC1wYy10cmFuc3BvcnQiLGUuRTJFRT0ibGstZTJlZSIsZS5EYXRhVHJhY2tzPSJsaXZla2l0LWRhdGEtdHJhY2tzIn0oYXR8fChhdD17fSkpO2xldCBzdD1vdC5nZXRMb2dnZXIoYXQuRGVmYXVsdCk7ZnVuY3Rpb24gY3QoZSx0KXtjb25zdCBuPW90LmdldExvZ2dlcihlKTtyZXR1cm4gbi5zZXREZWZhdWx0TGV2ZWwoc3QuZ2V0TGV2ZWwoKSksbn12YXIgdXQsbHQsZHQsZnQsaHQscHQ7T2JqZWN0LnZhbHVlcyhhdCkubWFwKChlPT5vdC5nZXRMb2dnZXIoZSkpKSxzdC5zZXREZWZhdWx0TGV2ZWwoaXQuaW5mbyksb3QuZ2V0TG9nZ2VyKGF0LkUyRUUpLGZ1bmN0aW9uKGUpe2UuQ29ubmVjdGVkPSJjb25uZWN0ZWQiLGUuUmVjb25uZWN0aW5nPSJyZWNvbm5lY3RpbmciLGUuU2lnbmFsUmVjb25uZWN0aW5nPSJzaWduYWxSZWNvbm5lY3RpbmciLGUuUmVjb25uZWN0ZWQ9InJlY29ubmVjdGVkIixlLkRpc2Nvbm5lY3RlZD0iZGlzY29ubmVjdGVkIixlLkNvbm5lY3Rpb25TdGF0ZUNoYW5nZWQ9ImNvbm5lY3Rpb25TdGF0ZUNoYW5nZWQiLGUuTW92ZWQ9Im1vdmVkIixlLk1lZGlhRGV2aWNlc0NoYW5nZWQ9Im1lZGlhRGV2aWNlc0NoYW5nZWQiLGUuUGFydGljaXBhbnRDb25uZWN0ZWQ9InBhcnRpY2lwYW50Q29ubmVjdGVkIixlLlBhcnRpY2lwYW50RGlzY29ubmVjdGVkPSJwYXJ0aWNpcGFudERpc2Nvbm5lY3RlZCIsZS5UcmFja1B1Ymxpc2hlZD0idHJhY2tQdWJsaXNoZWQiLGUuVHJhY2tTdWJzY3JpYmVkPSJ0cmFja1N1YnNjcmliZWQiLGUuVHJhY2tTdWJzY3JpcHRpb25GYWlsZWQ9InRyYWNrU3Vic2NyaXB0aW9uRmFpbGVkIixlLlRyYWNrVW5wdWJsaXNoZWQ9InRyYWNrVW5wdWJsaXNoZWQiLGUuVHJhY2tVbnN1YnNjcmliZWQ9InRyYWNrVW5zdWJzY3JpYmVkIixlLlRyYWNrTXV0ZWQ9InRyYWNrTXV0ZWQiLGUuVHJhY2tVbm11dGVkPSJ0cmFja1VubXV0ZWQiLGUuTG9jYWxUcmFja1B1Ymxpc2hlZD0ibG9jYWxUcmFja1B1Ymxpc2hlZCIsZS5Mb2NhbFRyYWNrVW5wdWJsaXNoZWQ9ImxvY2FsVHJhY2tVbnB1Ymxpc2hlZCIsZS5Mb2NhbEF1ZGlvU2lsZW5jZURldGVjdGVkPSJsb2NhbEF1ZGlvU2lsZW5jZURldGVjdGVkIixlLkFjdGl2ZVNwZWFrZXJzQ2hhbmdlZD0iYWN0aXZlU3BlYWtlcnNDaGFuZ2VkIixlLlBhcnRpY2lwYW50TWV0YWRhdGFDaGFuZ2VkPSJwYXJ0aWNpcGFudE1ldGFkYXRhQ2hhbmdlZCIsZS5QYXJ0aWNpcGFudE5hbWVDaGFuZ2VkPSJwYXJ0aWNpcGFudE5hbWVDaGFuZ2VkIixlLlBhcnRpY2lwYW50QXR0cmlidXRlc0NoYW5nZWQ9InBhcnRpY2lwYW50QXR0cmlidXRlc0NoYW5nZWQiLGUuUGFydGljaXBhbnRBY3RpdmU9InBhcnRpY2lwYW50QWN0aXZlIixlLlJvb21NZXRhZGF0YUNoYW5nZWQ9InJvb21NZXRhZGF0YUNoYW5nZWQiLGUuRGF0YVJlY2VpdmVkPSJkYXRhUmVjZWl2ZWQiLGUuU2lwRFRNRlJlY2VpdmVkPSJzaXBEVE1GUmVjZWl2ZWQiLGUuVHJhbnNjcmlwdGlvblJlY2VpdmVkPSJ0cmFuc2NyaXB0aW9uUmVjZWl2ZWQiLGUuQ29ubmVjdGlvblF1YWxpdHlDaGFuZ2VkPSJjb25uZWN0aW9uUXVhbGl0eUNoYW5nZWQiLGUuVHJhY2tTdHJlYW1TdGF0ZUNoYW5nZWQ9InRyYWNrU3RyZWFtU3RhdGVDaGFuZ2VkIixlLlRyYWNrU3Vic2NyaXB0aW9uUGVybWlzc2lvbkNoYW5nZWQ9InRyYWNrU3Vic2NyaXB0aW9uUGVybWlzc2lvbkNoYW5nZWQiLGUuVHJhY2tTdWJzY3JpcHRpb25TdGF0dXNDaGFuZ2VkPSJ0cmFja1N1YnNjcmlwdGlvblN0YXR1c0NoYW5nZWQiLGUuQXVkaW9QbGF5YmFja1N0YXR1c0NoYW5nZWQ9ImF1ZGlvUGxheWJhY2tDaGFuZ2VkIixlLlZpZGVvUGxheWJhY2tTdGF0dXNDaGFuZ2VkPSJ2aWRlb1BsYXliYWNrQ2hhbmdlZCIsZS5NZWRpYURldmljZXNFcnJvcj0ibWVkaWFEZXZpY2VzRXJyb3IiLGUuUGFydGljaXBhbnRQZXJtaXNzaW9uc0NoYW5nZWQ9InBhcnRpY2lwYW50UGVybWlzc2lvbnNDaGFuZ2VkIixlLlNpZ25hbENvbm5lY3RlZD0ic2lnbmFsQ29ubmVjdGVkIixlLlJlY29yZGluZ1N0YXR1c0NoYW5nZWQ9InJlY29yZGluZ1N0YXR1c0NoYW5nZWQiLGUuUGFydGljaXBhbnRFbmNyeXB0aW9uU3RhdHVzQ2hhbmdlZD0icGFydGljaXBhbnRFbmNyeXB0aW9uU3RhdHVzQ2hhbmdlZCIsZS5FbmNyeXB0aW9uRXJyb3I9ImVuY3J5cHRpb25FcnJvciIsZS5EQ0J1ZmZlclN0YXR1c0NoYW5nZWQ9ImRjQnVmZmVyU3RhdHVzQ2hhbmdlZCIsZS5BY3RpdmVEZXZpY2VDaGFuZ2VkPSJhY3RpdmVEZXZpY2VDaGFuZ2VkIixlLkNoYXRNZXNzYWdlPSJjaGF0TWVzc2FnZSIsZS5Mb2NhbFRyYWNrU3Vic2NyaWJlZD0ibG9jYWxUcmFja1N1YnNjcmliZWQiLGUuTWV0cmljc1JlY2VpdmVkPSJtZXRyaWNzUmVjZWl2ZWQiLGUuRGF0YVRyYWNrUHVibGlzaGVkPSJkYXRhVHJhY2tQdWJsaXNoZWQiLGUuRGF0YVRyYWNrVW5wdWJsaXNoZWQ9ImRhdGFUcmFja1VucHVibGlzaGVkIixlLkxvY2FsRGF0YVRyYWNrUHVibGlzaGVkPSJsb2NhbERhdGFUcmFja1B1Ymxpc2hlZCIsZS5Mb2NhbERhdGFUcmFja1VucHVibGlzaGVkPSJsb2NhbERhdGFUcmFja1VucHVibGlzaGVkIn0odXR8fCh1dD17fSkpLGZ1bmN0aW9uKGUpe2UuVHJhY2tQdWJsaXNoZWQ9InRyYWNrUHVibGlzaGVkIixlLlRyYWNrU3Vic2NyaWJlZD0idHJhY2tTdWJzY3JpYmVkIixlLlRyYWNrU3Vic2NyaXB0aW9uRmFpbGVkPSJ0cmFja1N1YnNjcmlwdGlvbkZhaWxlZCIsZS5UcmFja1VucHVibGlzaGVkPSJ0cmFja1VucHVibGlzaGVkIixlLlRyYWNrVW5zdWJzY3JpYmVkPSJ0cmFja1Vuc3Vic2NyaWJlZCIsZS5UcmFja011dGVkPSJ0cmFja011dGVkIixlLlRyYWNrVW5tdXRlZD0idHJhY2tVbm11dGVkIixlLkxvY2FsVHJhY2tQdWJsaXNoZWQ9ImxvY2FsVHJhY2tQdWJsaXNoZWQiLGUuTG9jYWxUcmFja1VucHVibGlzaGVkPSJsb2NhbFRyYWNrVW5wdWJsaXNoZWQiLGUuTG9jYWxUcmFja0NwdUNvbnN0cmFpbmVkPSJsb2NhbFRyYWNrQ3B1Q29uc3RyYWluZWQiLGUuTG9jYWxTZW5kZXJDcmVhdGVkPSJsb2NhbFNlbmRlckNyZWF0ZWQiLGUuUGFydGljaXBhbnRNZXRhZGF0YUNoYW5nZWQ9InBhcnRpY2lwYW50TWV0YWRhdGFDaGFuZ2VkIixlLlBhcnRpY2lwYW50TmFtZUNoYW5nZWQ9InBhcnRpY2lwYW50TmFtZUNoYW5nZWQiLGUuRGF0YVJlY2VpdmVkPSJkYXRhUmVjZWl2ZWQiLGUuU2lwRFRNRlJlY2VpdmVkPSJzaXBEVE1GUmVjZWl2ZWQiLGUuVHJhbnNjcmlwdGlvblJlY2VpdmVkPSJ0cmFuc2NyaXB0aW9uUmVjZWl2ZWQiLGUuSXNTcGVha2luZ0NoYW5nZWQ9ImlzU3BlYWtpbmdDaGFuZ2VkIixlLkNvbm5lY3Rpb25RdWFsaXR5Q2hhbmdlZD0iY29ubmVjdGlvblF1YWxpdHlDaGFuZ2VkIixlLlRyYWNrU3RyZWFtU3RhdGVDaGFuZ2VkPSJ0cmFja1N0cmVhbVN0YXRlQ2hhbmdlZCIsZS5UcmFja1N1YnNjcmlwdGlvblBlcm1pc3Npb25DaGFuZ2VkPSJ0cmFja1N1YnNjcmlwdGlvblBlcm1pc3Npb25DaGFuZ2VkIixlLlRyYWNrU3Vic2NyaXB0aW9uU3RhdHVzQ2hhbmdlZD0idHJhY2tTdWJzY3JpcHRpb25TdGF0dXNDaGFuZ2VkIixlLlRyYWNrQ3B1Q29uc3RyYWluZWQ9InRyYWNrQ3B1Q29uc3RyYWluZWQiLGUuTWVkaWFEZXZpY2VzRXJyb3I9Im1lZGlhRGV2aWNlc0Vycm9yIixlLkF1ZGlvU3RyZWFtQWNxdWlyZWQ9ImF1ZGlvU3RyZWFtQWNxdWlyZWQiLGUuUGFydGljaXBhbnRQZXJtaXNzaW9uc0NoYW5nZWQ9InBhcnRpY2lwYW50UGVybWlzc2lvbnNDaGFuZ2VkIixlLlBDVHJhY2tBZGRlZD0icGNUcmFja0FkZGVkIixlLkF0dHJpYnV0ZXNDaGFuZ2VkPSJhdHRyaWJ1dGVzQ2hhbmdlZCIsZS5Mb2NhbFRyYWNrU3Vic2NyaWJlZD0ibG9jYWxUcmFja1N1YnNjcmliZWQiLGUuQ2hhdE1lc3NhZ2U9ImNoYXRNZXNzYWdlIixlLkFjdGl2ZT0iYWN0aXZlIn0obHR8fChsdD17fSkpLGZ1bmN0aW9uKGUpe2UuVHJhbnNwb3J0c0NyZWF0ZWQ9InRyYW5zcG9ydHNDcmVhdGVkIixlLkNvbm5lY3RlZD0iY29ubmVjdGVkIixlLkRpc2Nvbm5lY3RlZD0iZGlzY29ubmVjdGVkIixlLlJlc3VtaW5nPSJyZXN1bWluZyIsZS5SZXN1bWVkPSJyZXN1bWVkIixlLlJlc3RhcnRpbmc9InJlc3RhcnRpbmciLGUuUmVzdGFydGVkPSJyZXN0YXJ0ZWQiLGUuU2lnbmFsUmVzdW1lZD0ic2lnbmFsUmVzdW1lZCIsZS5TaWduYWxSZXN0YXJ0ZWQ9InNpZ25hbFJlc3RhcnRlZCIsZS5DbG9zaW5nPSJjbG9zaW5nIixlLk1lZGlhVHJhY2tBZGRlZD0ibWVkaWFUcmFja0FkZGVkIixlLkFjdGl2ZVNwZWFrZXJzVXBkYXRlPSJhY3RpdmVTcGVha2Vyc1VwZGF0ZSIsZS5EYXRhUGFja2V0UmVjZWl2ZWQ9ImRhdGFQYWNrZXRSZWNlaXZlZCIsZS5SVFBWaWRlb01hcFVwZGF0ZT0icnRwVmlkZW9NYXBVcGRhdGUiLGUuRENCdWZmZXJTdGF0dXNDaGFuZ2VkPSJkY0J1ZmZlclN0YXR1c0NoYW5nZWQiLGUuUGFydGljaXBhbnRVcGRhdGU9InBhcnRpY2lwYW50VXBkYXRlIixlLlJvb21VcGRhdGU9InJvb21VcGRhdGUiLGUuU3BlYWtlcnNDaGFuZ2VkPSJzcGVha2Vyc0NoYW5nZWQiLGUuU3RyZWFtU3RhdGVDaGFuZ2VkPSJzdHJlYW1TdGF0ZUNoYW5nZWQiLGUuQ29ubmVjdGlvblF1YWxpdHlVcGRhdGU9ImNvbm5lY3Rpb25RdWFsaXR5VXBkYXRlIixlLlN1YnNjcmlwdGlvbkVycm9yPSJzdWJzY3JpcHRpb25FcnJvciIsZS5TdWJzY3JpcHRpb25QZXJtaXNzaW9uVXBkYXRlPSJzdWJzY3JpcHRpb25QZXJtaXNzaW9uVXBkYXRlIixlLlJlbW90ZU11dGU9InJlbW90ZU11dGUiLGUuU3Vic2NyaWJlZFF1YWxpdHlVcGRhdGU9InN1YnNjcmliZWRRdWFsaXR5VXBkYXRlIixlLkxvY2FsVHJhY2tVbnB1Ymxpc2hlZD0ibG9jYWxUcmFja1VucHVibGlzaGVkIixlLkxvY2FsVHJhY2tTdWJzY3JpYmVkPSJsb2NhbFRyYWNrU3Vic2NyaWJlZCIsZS5PZmZsaW5lPSJvZmZsaW5lIixlLlNpZ25hbFJlcXVlc3RSZXNwb25zZT0ic2lnbmFsUmVxdWVzdFJlc3BvbnNlIixlLlNpZ25hbENvbm5lY3RlZD0ic2lnbmFsQ29ubmVjdGVkIixlLlJvb21Nb3ZlZD0icm9vbU1vdmVkIixlLlB1Ymxpc2hEYXRhVHJhY2tSZXNwb25zZT0icHVibGlzaERhdGFUcmFja1Jlc3BvbnNlIixlLlVuUHVibGlzaERhdGFUcmFja1Jlc3BvbnNlPSJ1blB1Ymxpc2hEYXRhVHJhY2tSZXNwb25zZSIsZS5EYXRhVHJhY2tTdWJzY3JpYmVySGFuZGxlcz0iZGF0YVRyYWNrU3Vic2NyaWJlckhhbmRsZXMiLGUuRGF0YVRyYWNrUGFja2V0UmVjZWl2ZWQ9ImRhdGFUcmFja1BhY2tldFJlY2VpdmVkIixlLkpvaW5lZD0iam9pbmVkIixlLlRva2VuUmVmcmVzaGVkPSJ0b2tlblJlZnJlc2hlZCIsZS5TZXJ2ZXJSZWdpb25zUmVwb3J0ZWQ9InNlcnZlclJlZ2lvbnNSZXBvcnRlZCJ9KGR0fHwoZHQ9e30pKSxmdW5jdGlvbihlKXtlLk1lc3NhZ2U9Im1lc3NhZ2UiLGUuTXV0ZWQ9Im11dGVkIixlLlVubXV0ZWQ9InVubXV0ZWQiLGUuUmVzdGFydGVkPSJyZXN0YXJ0ZWQiLGUuRW5kZWQ9ImVuZGVkIixlLlN1YnNjcmliZWQ9InN1YnNjcmliZWQiLGUuVW5zdWJzY3JpYmVkPSJ1bnN1YnNjcmliZWQiLGUuQ3B1Q29uc3RyYWluZWQ9ImNwdUNvbnN0cmFpbmVkIixlLlVwZGF0ZVNldHRpbmdzPSJ1cGRhdGVTZXR0aW5ncyIsZS5VcGRhdGVTdWJzY3JpcHRpb249InVwZGF0ZVN1YnNjcmlwdGlvbiIsZS5BdWRpb1BsYXliYWNrU3RhcnRlZD0iYXVkaW9QbGF5YmFja1N0YXJ0ZWQiLGUuQXVkaW9QbGF5YmFja0ZhaWxlZD0iYXVkaW9QbGF5YmFja0ZhaWxlZCIsZS5BdWRpb1NpbGVuY2VEZXRlY3RlZD0iYXVkaW9TaWxlbmNlRGV0ZWN0ZWQiLGUuVmlzaWJpbGl0eUNoYW5nZWQ9InZpc2liaWxpdHlDaGFuZ2VkIixlLlZpZGVvRGltZW5zaW9uc0NoYW5nZWQ9InZpZGVvRGltZW5zaW9uc0NoYW5nZWQiLGUuVmlkZW9QbGF5YmFja1N0YXJ0ZWQ9InZpZGVvUGxheWJhY2tTdGFydGVkIixlLlZpZGVvUGxheWJhY2tGYWlsZWQ9InZpZGVvUGxheWJhY2tGYWlsZWQiLGUuRWxlbWVudEF0dGFjaGVkPSJlbGVtZW50QXR0YWNoZWQiLGUuRWxlbWVudERldGFjaGVkPSJlbGVtZW50RGV0YWNoZWQiLGUuVXBzdHJlYW1QYXVzZWQ9InVwc3RyZWFtUGF1c2VkIixlLlVwc3RyZWFtUmVzdW1lZD0idXBzdHJlYW1SZXN1bWVkIixlLlN1YnNjcmlwdGlvblBlcm1pc3Npb25DaGFuZ2VkPSJzdWJzY3JpcHRpb25QZXJtaXNzaW9uQ2hhbmdlZCIsZS5TdWJzY3JpcHRpb25TdGF0dXNDaGFuZ2VkPSJzdWJzY3JpcHRpb25TdGF0dXNDaGFuZ2VkIixlLlN1YnNjcmlwdGlvbkZhaWxlZD0ic3Vic2NyaXB0aW9uRmFpbGVkIixlLlRyYWNrUHJvY2Vzc29yVXBkYXRlPSJ0cmFja1Byb2Nlc3NvclVwZGF0ZSIsZS5BdWRpb1RyYWNrRmVhdHVyZVVwZGF0ZT0iYXVkaW9UcmFja0ZlYXR1cmVVcGRhdGUiLGUuVHJhbnNjcmlwdGlvblJlY2VpdmVkPSJ0cmFuc2NyaXB0aW9uUmVjZWl2ZWQiLGUuVGltZVN5bmNVcGRhdGU9InRpbWVTeW5jVXBkYXRlIixlLlByZUNvbm5lY3RCdWZmZXJGbHVzaGVkPSJwcmVDb25uZWN0QnVmZmVyRmx1c2hlZCJ9KGZ0fHwoZnQ9e30pKTtjbGFzcyBtdHtjb25zdHJ1Y3RvcihlLHQsbixyLGkpe2lmKCJvYmplY3QiPT10eXBlb2YgZSl0aGlzLndpZHRoPWUud2lkdGgsdGhpcy5oZWlnaHQ9ZS5oZWlnaHQsdGhpcy5hc3BlY3RSYXRpbz1lLmFzcGVjdFJhdGlvLHRoaXMuZW5jb2Rpbmc9e21heEJpdHJhdGU6ZS5tYXhCaXRyYXRlLG1heEZyYW1lcmF0ZTplLm1heEZyYW1lcmF0ZSxwcmlvcml0eTplLnByaW9yaXR5fTtlbHNle2lmKHZvaWQgMD09PXR8fHZvaWQgMD09PW4pdGhyb3cgbmV3IFR5cGVFcnJvcigiVW5zdXBwb3J0ZWQgb3B0aW9uczogcHJvdmlkZSBhdCBsZWFzdCB3aWR0aCwgaGVpZ2h0IGFuZCBtYXhCaXRyYXRlIik7dGhpcy53aWR0aD1lLHRoaXMuaGVpZ2h0PXQsdGhpcy5hc3BlY3RSYXRpbz1lL3QsdGhpcy5lbmNvZGluZz17bWF4Qml0cmF0ZTpuLG1heEZyYW1lcmF0ZTpyLHByaW9yaXR5Oml9fX1nZXQgcmVzb2x1dGlvbigpe3JldHVybnt3aWR0aDp0aGlzLndpZHRoLGhlaWdodDp0aGlzLmhlaWdodCxmcmFtZVJhdGU6dGhpcy5lbmNvZGluZy5tYXhGcmFtZXJhdGUsYXNwZWN0UmF0aW86dGhpcy5hc3BlY3RSYXRpb319fWZ1bmN0aW9uIGd0KGUpe3JldHVybiJtZWRpYVN0cmVhbVRyYWNrImluIGU/e3RyYWNrSUQ6ZS5zaWQsc291cmNlOmUuc291cmNlLG11dGVkOmUuaXNNdXRlZCxlbmFibGVkOmUubWVkaWFTdHJlYW1UcmFjay5lbmFibGVkLGtpbmQ6ZS5raW5kLHN0cmVhbUlEOmUubWVkaWFTdHJlYW1JRCxzdHJlYW1UcmFja0lEOmUubWVkaWFTdHJlYW1UcmFjay5pZH06e3RyYWNrSUQ6ZS50cmFja1NpZCxlbmFibGVkOmUuaXNFbmFibGVkLG11dGVkOmUuaXNNdXRlZCx0cmFja0luZm86T2JqZWN0LmFzc2lnbih7bWltZVR5cGU6ZS5taW1lVHlwZSxuYW1lOmUudHJhY2tOYW1lLGVuY3J5cHRlZDplLmlzRW5jcnlwdGVkLGtpbmQ6ZS5raW5kLHNvdXJjZTplLnNvdXJjZX0sZS50cmFjaz9ndChlLnRyYWNrKTp7fSl9fSFmdW5jdGlvbihlKXtlW2UuUFJFRkVSX1JFR1JFU1NJT049MF09IlBSRUZFUl9SRUdSRVNTSU9OIixlW2UuU0lNVUxDQVNUPTFdPSJTSU1VTENBU1QiLGVbZS5SRUdSRVNTSU9OPTJdPSJSRUdSRVNTSU9OIn0oaHR8fChodD17fSkpLGZ1bmN0aW9uKGUpe2UudGVsZXBob25lPXttYXhCaXRyYXRlOjEyZTN9LGUuc3BlZWNoPXttYXhCaXRyYXRlOjI0ZTN9LGUubXVzaWM9e21heEJpdHJhdGU6NDhlM30sZS5tdXNpY1N0ZXJlbz17bWF4Qml0cmF0ZTo2NGUzfSxlLm11c2ljSGlnaFF1YWxpdHk9e21heEJpdHJhdGU6OTZlM30sZS5tdXNpY0hpZ2hRdWFsaXR5U3RlcmVvPXttYXhCaXRyYXRlOjEyOGUzfX0ocHR8fChwdD17fSkpLG5ldyBtdCgxNjAsOTAsOWU0LDIwKSxuZXcgbXQoMzIwLDE4MCwxNmU0LDIwKSxuZXcgbXQoMzg0LDIxNiwxOGU0LDIwKSxuZXcgbXQoNjQwLDM2MCw0NWU0LDIwKSxuZXcgbXQoOTYwLDU0MCw4ZTUsMjUpLG5ldyBtdCgxMjgwLDcyMCwxN2U1LDMwKSxuZXcgbXQoMTkyMCwxMDgwLDNlNiwzMCksbmV3IG10KDI1NjAsMTQ0MCw1ZTYsMzApLG5ldyBtdCgzODQwLDIxNjAsOGU2LDMwKSxuZXcgbXQoMTYwLDEyMCw3ZTQsMjApLG5ldyBtdCgyNDAsMTgwLDEyNWUzLDIwKSxuZXcgbXQoMzIwLDI0MCwxNGU0LDIwKSxuZXcgbXQoNDgwLDM2MCwzM2U0LDIwKSxuZXcgbXQoNjQwLDQ4MCw1ZTUsMjApLG5ldyBtdCg3MjAsNTQwLDZlNSwyNSksbmV3IG10KDk2MCw3MjAsMTNlNSwzMCksbmV3IG10KDE0NDAsMTA4MCwyM2U1LDMwKSxuZXcgbXQoMTkyMCwxNDQwLDM4ZTUsMzApLG5ldyBtdCg2NDAsMzYwLDJlNSwzLCJtZWRpdW0iKSxuZXcgbXQoNjQwLDM2MCw0ZTUsMTUsIm1lZGl1bSIpLG5ldyBtdCgxMjgwLDcyMCw4ZTUsNSwibWVkaXVtIiksbmV3IG10KDEyODAsNzIwLDE1ZTUsMTUsIm1lZGl1bSIpLG5ldyBtdCgxMjgwLDcyMCwyZTYsMzAsIm1lZGl1bSIpLG5ldyBtdCgxOTIwLDEwODAsMjVlNSwxNSwibWVkaXVtIiksbmV3IG10KDE5MjAsMTA4MCw1ZTYsMzAsIm1lZGl1bSIpLG5ldyBtdCgwLDAsN2U2LDMwLCJtZWRpdW0iKTtjb25zdCBidD1bXTt2YXIgeXQ7IWZ1bmN0aW9uKGUpe2VbZS5MT1c9MF09IkxPVyIsZVtlLk1FRElVTT0xXT0iTUVESVVNIixlW2UuSElHSD0yXT0iSElHSCJ9KHl0fHwoeXQ9e30pKTtjbGFzcyB2dCBleHRlbmRzIFplLkV2ZW50RW1pdHRlcntnZXQgc3RyZWFtU3RhdGUoKXtyZXR1cm4gdGhpcy5fc3RyZWFtU3RhdGV9c2V0U3RyZWFtU3RhdGUoZSl7dGhpcy5fc3RyZWFtU3RhdGU9ZX1jb25zdHJ1Y3RvcihlLHQpe2xldCBuPWFyZ3VtZW50cy5sZW5ndGg+MiYmdm9pZCAwIT09YXJndW1lbnRzWzJdP2FyZ3VtZW50c1syXTp7fTt2YXIgcjtzdXBlcigpLHRoaXMuYXR0YWNoZWRFbGVtZW50cz1bXSx0aGlzLmlzTXV0ZWQ9ITEsdGhpcy5fc3RyZWFtU3RhdGU9dnQuU3RyZWFtU3RhdGUuQWN0aXZlLHRoaXMuaXNJbkJhY2tncm91bmQ9ITEsdGhpcy5fY3VycmVudEJpdHJhdGU9MCx0aGlzLmxvZz1zdCx0aGlzLmFwcFZpc2liaWxpdHlDaGFuZ2VkTGlzdGVuZXI9KCk9Pnt0aGlzLmJhY2tncm91bmRUaW1lb3V0JiZjbGVhclRpbWVvdXQodGhpcy5iYWNrZ3JvdW5kVGltZW91dCksImhpZGRlbiI9PT1kb2N1bWVudC52aXNpYmlsaXR5U3RhdGU/dGhpcy5iYWNrZ3JvdW5kVGltZW91dD1zZXRUaW1lb3V0KCgoKT0+dGhpcy5oYW5kbGVBcHBWaXNpYmlsaXR5Q2hhbmdlZCgpKSw1ZTMpOnRoaXMuaGFuZGxlQXBwVmlzaWJpbGl0eUNoYW5nZWQoKX0sdGhpcy5sb2c9Y3QobnVsbCE9PShyPW4ubG9nZ2VyTmFtZSkmJnZvaWQgMCE9PXI/cjphdC5UcmFjayksdGhpcy5sb2dnZXJDb250ZXh0Q2I9bi5sb2dnZXJDb250ZXh0Q2IsdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMTAwKSx0aGlzLmtpbmQ9dCx0aGlzLl9tZWRpYVN0cmVhbVRyYWNrPWUsdGhpcy5fbWVkaWFTdHJlYW1JRD1lLmlkLHRoaXMuc291cmNlPXZ0LlNvdXJjZS5Vbmtub3dufWdldCBsb2dDb250ZXh0KCl7dmFyIGU7cmV0dXJuIE9iamVjdC5hc3NpZ24oT2JqZWN0LmFzc2lnbih7fSxudWxsPT09KGU9dGhpcy5sb2dnZXJDb250ZXh0Q2IpfHx2b2lkIDA9PT1lP3ZvaWQgMDplLmNhbGwodGhpcykpLGd0KHRoaXMpKX1nZXQgY3VycmVudEJpdHJhdGUoKXtyZXR1cm4gdGhpcy5fY3VycmVudEJpdHJhdGV9Z2V0IG1lZGlhU3RyZWFtVHJhY2soKXtyZXR1cm4gdGhpcy5fbWVkaWFTdHJlYW1UcmFja31nZXQgbWVkaWFTdHJlYW1JRCgpe3JldHVybiB0aGlzLl9tZWRpYVN0cmVhbUlEfWF0dGFjaChlKXtsZXQgdD0iYXVkaW8iO3RoaXMua2luZD09PXZ0LktpbmQuVmlkZW8mJih0PSJ2aWRlbyIpLDA9PT10aGlzLmF0dGFjaGVkRWxlbWVudHMubGVuZ3RoJiZ0aGlzLmtpbmQ9PT12dC5LaW5kLlZpZGVvJiZ0aGlzLmFkZEFwcFZpc2liaWxpdHlMaXN0ZW5lcigpLGV8fCgiYXVkaW8iPT09dCYmKGJ0LmZvckVhY2goKHQ9PntudWxsIT09dC5wYXJlbnRFbGVtZW50fHxlfHwoZT10KX0pKSxlJiZidC5zcGxpY2UoYnQuaW5kZXhPZihlKSwxKSksZXx8KGU9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0KSkpLHRoaXMuYXR0YWNoZWRFbGVtZW50cy5pbmNsdWRlcyhlKXx8dGhpcy5hdHRhY2hlZEVsZW1lbnRzLnB1c2goZSksZnVuY3Rpb24oZSx0KXtsZXQgbixyO249dC5zcmNPYmplY3QgaW5zdGFuY2VvZiBNZWRpYVN0cmVhbT90LnNyY09iamVjdDpuZXcgTWVkaWFTdHJlYW07cj0iYXVkaW8iPT09ZS5raW5kP24uZ2V0QXVkaW9UcmFja3MoKTpuLmdldFZpZGVvVHJhY2tzKCk7ci5pbmNsdWRlcyhlKXx8KHIuZm9yRWFjaCgoZT0+e24ucmVtb3ZlVHJhY2soZSl9KSksbi5hZGRUcmFjayhlKSk7d3QoKSYmdCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnR8fCh0LmF1dG9wbGF5PSEwKTt0Lm11dGVkPTA9PT1uLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoLHQgaW5zdGFuY2VvZiBIVE1MVmlkZW9FbGVtZW50JiYodC5wbGF5c0lubGluZT0hMCk7dC5zcmNPYmplY3QhPT1uJiYodC5zcmNPYmplY3Q9biwod3QoKXx8ZnVuY3Rpb24oKXt2YXIgZTtyZXR1cm4iRmlyZWZveCI9PT0obnVsbD09PShlPUdlKCkpfHx2b2lkIDA9PT1lP3ZvaWQgMDplLm5hbWUpfSgpKSYmdCBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQmJnNldFRpbWVvdXQoKCgpPT57dC5zcmNPYmplY3Q9bix0LnBsYXkoKS5jYXRjaCgoKCk9Pnt9KSl9KSwwKSl9KHRoaXMubWVkaWFTdHJlYW1UcmFjayxlKTtjb25zdCBuPWUuc3JjT2JqZWN0LmdldFRyYWNrcygpLHI9bi5zb21lKChlPT4iYXVkaW8iPT09ZS5raW5kKSk7cmV0dXJuIGUucGxheSgpLnRoZW4oKCgpPT57dGhpcy5lbWl0KHI/ZnQuQXVkaW9QbGF5YmFja1N0YXJ0ZWQ6ZnQuVmlkZW9QbGF5YmFja1N0YXJ0ZWQpfSkpLmNhdGNoKCh0PT57Ik5vdEFsbG93ZWRFcnJvciI9PT10Lm5hbWU/dGhpcy5lbWl0KHI/ZnQuQXVkaW9QbGF5YmFja0ZhaWxlZDpmdC5WaWRlb1BsYXliYWNrRmFpbGVkLHQpOiJBYm9ydEVycm9yIj09PXQubmFtZT9zdC5kZWJ1ZygiIi5jb25jYXQocj8iYXVkaW8iOiJ2aWRlbyIsIiBwbGF5YmFjayBhYm9ydGVkLCBsaWtlbHkgZHVlIHRvIG5ldyBwbGF5IHJlcXVlc3QiKSk6c3Qud2FybigiY291bGQgbm90IHBsYXliYWNrICIuY29uY2F0KHI/ImF1ZGlvIjoidmlkZW8iKSx0KSxyJiZlJiZuLnNvbWUoKGU9PiJ2aWRlbyI9PT1lLmtpbmQpKSYmIk5vdEFsbG93ZWRFcnJvciI9PT10Lm5hbWUmJihlLm11dGVkPSEwLGUucGxheSgpLmNhdGNoKCgoKT0+e30pKSl9KSksdGhpcy5lbWl0KGZ0LkVsZW1lbnRBdHRhY2hlZCxlKSxlfWRldGFjaChlKXt0cnl7aWYoZSl7a3QodGhpcy5tZWRpYVN0cmVhbVRyYWNrLGUpO2NvbnN0IHQ9dGhpcy5hdHRhY2hlZEVsZW1lbnRzLmluZGV4T2YoZSk7cmV0dXJuIHQ+PTAmJih0aGlzLmF0dGFjaGVkRWxlbWVudHMuc3BsaWNlKHQsMSksdGhpcy5yZWN5Y2xlRWxlbWVudChlKSx0aGlzLmVtaXQoZnQuRWxlbWVudERldGFjaGVkLGUpKSxlfWNvbnN0IHQ9W107cmV0dXJuIHRoaXMuYXR0YWNoZWRFbGVtZW50cy5mb3JFYWNoKChlPT57a3QodGhpcy5tZWRpYVN0cmVhbVRyYWNrLGUpLHQucHVzaChlKSx0aGlzLnJlY3ljbGVFbGVtZW50KGUpLHRoaXMuZW1pdChmdC5FbGVtZW50RGV0YWNoZWQsZSl9KSksdGhpcy5hdHRhY2hlZEVsZW1lbnRzPVtdLHR9ZmluYWxseXswPT09dGhpcy5hdHRhY2hlZEVsZW1lbnRzLmxlbmd0aCYmdGhpcy5yZW1vdmVBcHBWaXNpYmlsaXR5TGlzdGVuZXIoKX19c3RvcCgpe3RoaXMuc3RvcE1vbml0b3IoKSx0aGlzLl9tZWRpYVN0cmVhbVRyYWNrLnN0b3AoKX1lbmFibGUoKXt0aGlzLl9tZWRpYVN0cmVhbVRyYWNrLmVuYWJsZWQ9ITB9ZGlzYWJsZSgpe3RoaXMuX21lZGlhU3RyZWFtVHJhY2suZW5hYmxlZD0hMX1zdG9wTW9uaXRvcigpe3RoaXMubW9uaXRvckludGVydmFsJiZjbGVhckludGVydmFsKHRoaXMubW9uaXRvckludGVydmFsKSx0aGlzLnRpbWVTeW5jSGFuZGxlJiZjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLnRpbWVTeW5jSGFuZGxlKX11cGRhdGVMb2dnZXJPcHRpb25zKGUpe2UubG9nZ2VyTmFtZSYmKHRoaXMubG9nPWN0KGUubG9nZ2VyTmFtZSkpLGUubG9nZ2VyQ29udGV4dENiJiYodGhpcy5sb2dnZXJDb250ZXh0Q2I9ZS5sb2dnZXJDb250ZXh0Q2IpfXJlY3ljbGVFbGVtZW50KGUpe2lmKGUgaW5zdGFuY2VvZiBIVE1MQXVkaW9FbGVtZW50KXtsZXQgdD0hMDtlLnBhdXNlKCksYnQuZm9yRWFjaCgoZT0+e2UucGFyZW50RWxlbWVudHx8KHQ9ITEpfSkpLHQmJmJ0LnB1c2goZSl9fWhhbmRsZUFwcFZpc2liaWxpdHlDaGFuZ2VkKCl7cmV0dXJuIHhlKHRoaXMsdm9pZCAwLHZvaWQgMCwoZnVuY3Rpb24qKCl7dGhpcy5pc0luQmFja2dyb3VuZD0iaGlkZGVuIj09PWRvY3VtZW50LnZpc2liaWxpdHlTdGF0ZSx0aGlzLmlzSW5CYWNrZ3JvdW5kfHx0aGlzLmtpbmQhPT12dC5LaW5kLlZpZGVvfHxzZXRUaW1lb3V0KCgoKT0+dGhpcy5hdHRhY2hlZEVsZW1lbnRzLmZvckVhY2goKGU9PmUucGxheSgpLmNhdGNoKCgoKT0+e30pKSkpKSwwKX0pKX1hZGRBcHBWaXNpYmlsaXR5TGlzdGVuZXIoKXtUdCgpPyh0aGlzLmlzSW5CYWNrZ3JvdW5kPSJoaWRkZW4iPT09ZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlLGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoInZpc2liaWxpdHljaGFuZ2UiLHRoaXMuYXBwVmlzaWJpbGl0eUNoYW5nZWRMaXN0ZW5lcikpOnRoaXMuaXNJbkJhY2tncm91bmQ9ITF9cmVtb3ZlQXBwVmlzaWJpbGl0eUxpc3RlbmVyKCl7VHQoKSYmZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigidmlzaWJpbGl0eWNoYW5nZSIsdGhpcy5hcHBWaXNpYmlsaXR5Q2hhbmdlZExpc3RlbmVyKX19ZnVuY3Rpb24ga3QoZSx0KXtpZih0LnNyY09iamVjdCBpbnN0YW5jZW9mIE1lZGlhU3RyZWFtKXtjb25zdCBuPXQuc3JjT2JqZWN0O24ucmVtb3ZlVHJhY2soZSksbi5nZXRUcmFja3MoKS5sZW5ndGg+MD90LnNyY09iamVjdD1uOnQuc3JjT2JqZWN0PW51bGx9fWZ1bmN0aW9uIHd0KCl7dmFyIGU7cmV0dXJuIlNhZmFyaSI9PT0obnVsbD09PShlPUdlKCkpfHx2b2lkIDA9PT1lP3ZvaWQgMDplLm5hbWUpfWZ1bmN0aW9uIFR0KCl7cmV0dXJuInVuZGVmaW5lZCIhPXR5cGVvZiBkb2N1bWVudH1mdW5jdGlvbiBTdChlKXtyZXR1cm4hKCEobnVsbD09ZT92b2lkIDA6ZS50aW1lc3RhbXApJiYhKG51bGw9PWU/dm9pZCAwOmUuZnJhbWVJZCkpfSFmdW5jdGlvbihlKXtsZXQgdCxuLHI7IWZ1bmN0aW9uKGUpe2UuQXVkaW89ImF1ZGlvIixlLlZpZGVvPSJ2aWRlbyIsZS5Vbmtub3duPSJ1bmtub3duIn0odD1lLktpbmR8fChlLktpbmQ9e30pKSxmdW5jdGlvbihlKXtlLkNhbWVyYT0iY2FtZXJhIixlLk1pY3JvcGhvbmU9Im1pY3JvcGhvbmUiLGUuU2NyZWVuU2hhcmU9InNjcmVlbl9zaGFyZSIsZS5TY3JlZW5TaGFyZUF1ZGlvPSJzY3JlZW5fc2hhcmVfYXVkaW8iLGUuVW5rbm93bj0idW5rbm93biJ9KG49ZS5Tb3VyY2V8fChlLlNvdXJjZT17fSkpLGZ1bmN0aW9uKGUpe2UuQWN0aXZlPSJhY3RpdmUiLGUuUGF1c2VkPSJwYXVzZWQiLGUuVW5rbm93bj0idW5rbm93biJ9KHI9ZS5TdHJlYW1TdGF0ZXx8KGUuU3RyZWFtU3RhdGU9e30pKSxlLmtpbmRUb1Byb3RvPWZ1bmN0aW9uKGUpe3N3aXRjaChlKXtjYXNlIHQuQXVkaW86cmV0dXJuIFJlLkFVRElPO2Nhc2UgdC5WaWRlbzpyZXR1cm4gUmUuVklERU87ZGVmYXVsdDpyZXR1cm4gUmUuREFUQX19LGUua2luZEZyb21Qcm90bz1mdW5jdGlvbihlKXtzd2l0Y2goZSl7Y2FzZSBSZS5BVURJTzpyZXR1cm4gdC5BdWRpbztjYXNlIFJlLlZJREVPOnJldHVybiB0LlZpZGVvO2RlZmF1bHQ6cmV0dXJuIHQuVW5rbm93bn19LGUuc291cmNlVG9Qcm90bz1mdW5jdGlvbihlKXtzd2l0Y2goZSl7Y2FzZSBuLkNhbWVyYTpyZXR1cm4gQmUuQ0FNRVJBO2Nhc2Ugbi5NaWNyb3Bob25lOnJldHVybiBCZS5NSUNST1BIT05FO2Nhc2Ugbi5TY3JlZW5TaGFyZTpyZXR1cm4gQmUuU0NSRUVOX1NIQVJFO2Nhc2Ugbi5TY3JlZW5TaGFyZUF1ZGlvOnJldHVybiBCZS5TQ1JFRU5fU0hBUkVfQVVESU87ZGVmYXVsdDpyZXR1cm4gQmUuVU5LTk9XTn19LGUuc291cmNlRnJvbVByb3RvPWZ1bmN0aW9uKGUpe3N3aXRjaChlKXtjYXNlIEJlLkNBTUVSQTpyZXR1cm4gbi5DYW1lcmE7Y2FzZSBCZS5NSUNST1BIT05FOnJldHVybiBuLk1pY3JvcGhvbmU7Y2FzZSBCZS5TQ1JFRU5fU0hBUkU6cmV0dXJuIG4uU2NyZWVuU2hhcmU7Y2FzZSBCZS5TQ1JFRU5fU0hBUkVfQVVESU86cmV0dXJuIG4uU2NyZWVuU2hhcmVBdWRpbztkZWZhdWx0OnJldHVybiBuLlVua25vd259fSxlLnN0cmVhbVN0YXRlRnJvbVByb3RvPWZ1bmN0aW9uKGUpe3N3aXRjaChlKXtjYXNlIFBlLkFDVElWRTpyZXR1cm4gci5BY3RpdmU7Y2FzZSBQZS5QQVVTRUQ6cmV0dXJuIHIuUGF1c2VkO2RlZmF1bHQ6cmV0dXJuIHIuVW5rbm93bn19fSh2dHx8KHZ0PXt9KSk7Y29uc3QgRXQ9VWludDhBcnJheS5mcm9tKFsiTCIuY2hhckNvZGVBdCgwKSwiSyIuY2hhckNvZGVBdCgwKSwiVCIuY2hhckNvZGVBdCgwKSwiUyIuY2hhckNvZGVBdCgwKV0pO2Z1bmN0aW9uIE50KGUsdCxuKXtjb25zdCByPXQhPT1CaWdJbnQoMCksaT0wIT09bjtpZighciYmIWkpcmV0dXJuIGU7Y29uc3QgYT0ocj8xMDowKSsoaT82OjApKzUsbz1uZXcgVWludDhBcnJheShlLmxlbmd0aCthKTtsZXQgcz0wO3JldHVybiBvLnNldChlLHMpLHMrPWUubGVuZ3RoLHImJihvW3MrK109MjU0LG9bcysrXT0yNDcsZnVuY3Rpb24oZSx0LG4pe2NvbnN0IHI9TnVtYmVyKG4+PkJpZ0ludCgzMikmQmlnSW50KDQyOTQ5NjcyOTUpKSxpPU51bWJlcihuJkJpZ0ludCg0Mjk0OTY3Mjk1KSk7ZVt0XT1yPj4+MjReMjU1LGVbdCsxXT1yPj4+MTYmMjU1XjI1NSxlW3QrMl09cj4+PjgmMjU1XjI1NSxlW3QrM109MjU1JnJeMjU1LGVbdCs0XT1pPj4+MjReMjU1LGVbdCs1XT1pPj4+MTYmMjU1XjI1NSxlW3QrNl09aT4+PjgmMjU1XjI1NSxlW3QrN109MjU1JmleMjU1fShvLHMsdCkscys9OCksaSYmKG9bcysrXT0yNTMsb1tzKytdPTI1MSxmdW5jdGlvbihlLHQsbil7Zm9yKGxldCByPTM7cj49MDtyLT0xKWVbdCsoMy1yKV09bj4+OCpyJjI1NV4yNTV9KG8scyxuKSxzKz00KSxvW3MrK109MjU1XmEsby5zZXQoRXQscyksb31mdW5jdGlvbiBJdChlKXtjb25zdCB0PWUgaW5zdGFuY2VvZiBVaW50OEFycmF5P2U6bmV3IFVpbnQ4QXJyYXkoZSk7aWYodC5sZW5ndGg8NSlyZXR1cm57ZGF0YTp0fTtpZighZnVuY3Rpb24oZSx0KXtmb3IobGV0IG49MDtuPEV0Lmxlbmd0aDtuKz0xKWlmKGVbdCtuXSE9PUV0W25dKXJldHVybiExO3JldHVybiEwfSh0LHQubGVuZ3RoLUV0Lmxlbmd0aCkpcmV0dXJue2RhdGE6dH07Y29uc3Qgbj0yNTVedFt0Lmxlbmd0aC01XTtpZihuPDV8fG4+dC5sZW5ndGgpcmV0dXJue2RhdGE6dH07Y29uc3Qgcj10Lmxlbmd0aC1uLGk9dC5sZW5ndGgtNSxhPXQuc3ViYXJyYXkoMCxyKTtsZXQgbz1yLHM9ITE7Y29uc3QgYz17dXNlclRpbWVzdGFtcDpCaWdJbnQoMCksZnJhbWVJZDowfTtmb3IoO28rMjw9aTspe2NvbnN0IGU9MjU1XnRbbysrXSxuPTI1NV50W28rK107aWYobytuPmkpYnJlYWs7aWYoMT09PWUmJjg9PT1uKWMudXNlclRpbWVzdGFtcD1PdCh0LG8pLHM9ITA7ZWxzZSBpZigyPT09ZSYmND09PW4pYy5mcmFtZUlkPUN0KHQsbyxuKSxzPSEwO2Vsc2UgaWYoMz09PWUpe2NvbnN0IGU9bmV3IFVpbnQ4QXJyYXkobik7Zm9yKGxldCByPTA7cjxuO3IrPTEpZVtyXT0yNTVedFtvK3JdO2MudXNlckRhdGE9ZSxzPSEwfW8rPW59cmV0dXJuIHM/e2RhdGE6YSxtZXRhZGF0YTpjfTp7ZGF0YTp0fX1mdW5jdGlvbiBPdChlLHQpe2NvbnN0IG49QmlnSW50KCgoMjU1XmVbdF0pPDwyNHwoMjU1XmVbdCsxXSk8PDE2fCgyNTVeZVt0KzJdKTw8OHwyNTVeZVt0KzNdKT4+PjApLHI9QmlnSW50KCgoMjU1XmVbdCs0XSk8PDI0fCgyNTVeZVt0KzVdKTw8MTZ8KDI1NV5lW3QrNl0pPDw4fDI1NV5lW3QrN10pPj4+MCk7cmV0dXJuIG48PEJpZ0ludCgzMil8cn1mdW5jdGlvbiBDdChlLHQsbil7bGV0IHI9MDtmb3IobGV0IGk9MDtpPG47aSs9MSlyPXI8PDh8MjU1XmVbdCtpXTtyZXR1cm4gcj4+PjB9ZnVuY3Rpb24gQXQoZSl7dHJ5e2NvbnN0IHQ9ZS5nZXRNZXRhZGF0YSgpO2lmKCJudW1iZXIiPT10eXBlb2YgdC5zeW5jaHJvbml6YXRpb25Tb3VyY2UpcmV0dXJuIHQuc3luY2hyb25pemF0aW9uU291cmNlfWNhdGNoKGUpe31yZXR1cm4gMH1jb25zdCBVdD1uZXcgTWFwO2Z1bmN0aW9uIEx0KGUsdCxuLHIpe2NvbnN0IGk9e3RyYWNrSWQ6bixoYXNQYWNrZXRUcmFpbGVyOnJ9O1V0LnNldChuLGkpO2NvbnN0IGE9bmV3IFRyYW5zZm9ybVN0cmVhbSh7dHJhbnNmb3JtKGUsdCl7dHJ5e2lmKGkuaGFzUGFja2V0VHJhaWxlcil7Y29uc3QgdD1mdW5jdGlvbihlLHQpe2lmKDA9PT1lLmRhdGEuYnl0ZUxlbmd0aClyZXR1cm57fTtjb25zdCBuPUl0KGUuZGF0YSk7aWYoIW4ubWV0YWRhdGEpcmV0dXJue307Y29uc3Qgcj1uLmRhdGEuYnVmZmVyLnNsaWNlKG4uZGF0YS5ieXRlT2Zmc2V0LG4uZGF0YS5ieXRlT2Zmc2V0K24uZGF0YS5ieXRlTGVuZ3RoKSxpPWZ1bmN0aW9uKGUpe3RyeXtjb25zdCB0PWUuZ2V0TWV0YWRhdGEoKTtpZigibnVtYmVyIj09dHlwZW9mIHQucnRwVGltZXN0YW1wKXJldHVybiB0LnJ0cFRpbWVzdGFtcDtpZigibnVtYmVyIj09dHlwZW9mIHQudGltZXN0YW1wKXJldHVybiB0LnRpbWVzdGFtcH1jYXRjaChlKXt9aWYoIm51bWJlciI9PXR5cGVvZiBlLnRpbWVzdGFtcClyZXR1cm4gZS50aW1lc3RhbXB9KGUpO3JldHVybiB2b2lkIDAhPT1pJiZ0P3tkYXRhOnIscGF5bG9hZDp7dHJhY2tJZDp0LHJ0cFRpbWVzdGFtcDppLHNzcmM6QXQoZSksbWV0YWRhdGE6bi5tZXRhZGF0YX19OntkYXRhOnJ9fShlLGkudHJhY2tJZCk7aWYodC5kYXRhJiYoZS5kYXRhPXQuZGF0YSksdC5wYXlsb2FkKXtjb25zdCBlPXtraW5kOiJtZXRhZGF0YSIsZGF0YTp0LnBheWxvYWR9O3Bvc3RNZXNzYWdlKGUpfX19Y2F0Y2goZSl7fXQuZW5xdWV1ZShlKX19KTtlLnBpcGVUaHJvdWdoKGEpLnBpcGVUbyh0KS5jYXRjaCgoKCk9PntVdC5kZWxldGUoaS50cmFja0lkKX0pKX1mdW5jdGlvbiBGdChlLHQsbil7aWYoIVN0KG4pKXJldHVybiB2b2lkIGUucGlwZVRvKHQpLmNhdGNoKCgoKT0+e30pKTtsZXQgcj0wO2NvbnN0IGk9bmV3IFRyYW5zZm9ybVN0cmVhbSh7dHJhbnNmb3JtKGUsdCl7dHJ5eyhudWxsPT1uP3ZvaWQgMDpuLmZyYW1lSWQpJiYocj00Mjk0OTY3Mjk1PT09cj8xOnIrMSksZnVuY3Rpb24oZSx0LG4pe2lmKCFTdCh0KXx8MD09PWUuZGF0YS5ieXRlTGVuZ3RoKXJldHVybiExO2NvbnN0IHI9KG51bGw9PXQ/dm9pZCAwOnQudGltZXN0YW1wKT9CaWdJbnQoRGF0ZS5ub3coKSkqQmlnSW50KDFlMyk6QmlnSW50KDApLGk9KG51bGw9PXQ/dm9pZCAwOnQuZnJhbWVJZCk/bjowLGE9bmV3IFVpbnQ4QXJyYXkoZS5kYXRhKSxvPU50KGEscixpKTtvLmJ5dGVMZW5ndGghPT1hLmJ5dGVMZW5ndGgmJihlLmRhdGE9by5idWZmZXIuc2xpY2Uoby5ieXRlT2Zmc2V0LG8uYnl0ZU9mZnNldCtvLmJ5dGVMZW5ndGgpKX0oZSxuLHIpfWNhdGNoKGUpe310LmVucXVldWUoZSl9fSk7ZS5waXBlVGhyb3VnaChpKS5waXBlVG8odCkuY2F0Y2goKCgpPT57fSkpfW9ubWVzc2FnZT1lPT57Y29uc3QgdD1lLmRhdGE7c3dpdGNoKHQua2luZCl7Y2FzZSJpbml0Ijpwb3N0TWVzc2FnZSh7a2luZDoiaW5pdEFjayJ9KTticmVhaztjYXNlImRlY29kZSI6THQodC5kYXRhLnJlYWRhYmxlU3RyZWFtLHQuZGF0YS53cml0YWJsZVN0cmVhbSx0LmRhdGEudHJhY2tJZCx0LmRhdGEuaGFzUGFja2V0VHJhaWxlcik7YnJlYWs7Y2FzZSJlbmNvZGUiOkZ0KHQuZGF0YS5yZWFkYWJsZVN0cmVhbSx0LmRhdGEud3JpdGFibGVTdHJlYW0sdC5kYXRhLnBhY2tldFRyYWlsZXIpO2JyZWFrO2Nhc2UidXBkYXRlVHJhY2tJZCI6IWZ1bmN0aW9uKGUsdCxuKXtjb25zdCByPVV0LmdldChlKTtyJiYoci50cmFja0lkPXQsci5oYXNQYWNrZXRUcmFpbGVyPW4sVXQuZGVsZXRlKGUpLFV0LnNldCh0LHIpKX0odC5kYXRhLm9sZFRyYWNrSWQsdC5kYXRhLm5ld1RyYWNrSWQsdC5kYXRhLmhhc1BhY2tldFRyYWlsZXIpfX0sc2VsZi5SVENUcmFuc2Zvcm1FdmVudCYmKHNlbGYub25ydGN0cmFuc2Zvcm09ZT0+e2NvbnN0IHQ9ZS50cmFuc2Zvcm1lcixuPXQub3B0aW9uczsiZW5jb2RlIj09PW4ua2luZD9GdCh0LnJlYWRhYmxlLHQud3JpdGFibGUsbi5wYWNrZXRUcmFpbGVyKTpMdCh0LnJlYWRhYmxlLHQud3JpdGFibGUsbi50cmFja0lkLCEwKX0pfSkpOwovLyMgc291cmNlTWFwcGluZ1VSTD1saXZla2l0LWNsaWVudC5mbS53b3JrZXIuanMubWFwCg==", "" + import.meta.url);
function Nu() {
	return new Worker(Mu());
}
function Pu(e, t) {
	return e.protocol !== "http:" && e.protocol !== "https:" || e.origin === t;
}
function Fu() {
	if (typeof window > "u") return !1;
	try {
		if (!Pu(Mu(), window.location?.origin)) return !1;
	} catch {
		return !1;
	}
	let e = window, t = window.navigator?.userAgent?.toLowerCase() ?? "", n = /(?:chrome|chromium|crmo)\//.test(t) && !/crios\//.test(t), r = e.RTCRtpScriptTransform !== void 0 && !n, i = e.RTCRtpSender?.prototype?.createEncodedStreams !== void 0 && e.RTCRtpReceiver?.prototype?.createEncodedStreams !== void 0;
	return r || i;
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/preflight-connectivity.js
function Iu(e) {
	return e.type ? e.type : /\btyp (\w+)/.exec(e.candidate)?.[1] ?? "";
}
function Lu() {
	return globalThis.performance?.now?.() ?? Date.now();
}
async function Ru(e, t, n, r) {
	if (n?.aborted) return {
		transport: "failed",
		rttMs: null
	};
	let i = globalThis?.RTCPeerConnection;
	if (typeof i != "function") return r.warn("preflight: RTCPeerConnection unavailable in this environment"), {
		transport: "failed",
		rttMs: null
	};
	let a = null;
	try {
		a = new i({ iceServers: e }), a.createDataChannel("decart-preflight");
		let o = !1, s = !1, c = null, l = Lu();
		await new Promise((e) => {
			let i = !1, l, u = () => {
				i || (i = !0, clearTimeout(l), n?.removeEventListener("abort", u), e());
			};
			l = setTimeout(u, t), n?.addEventListener("abort", u, { once: !0 }), n?.aborted && u();
			let d = a;
			d.onicecandidate = (e) => {
				if (!e.candidate || e.candidate.candidate === "") return u();
				Iu(e.candidate) === "srflx" ? (o = !0, c === null && (c = Lu())) : s = !0;
			}, d.onicegatheringstatechange = () => {
				d.iceGatheringState === "complete" && u();
			}, d.createOffer().then((e) => d.setLocalDescription(e)).catch((e) => {
				r.warn("preflight: failed to create offer", { error: e instanceof Error ? e.message : String(e) }), u();
			});
		});
		let u = c === null ? null : Math.round(c - l);
		return {
			transport: o ? "udp" : s ? "relay" : "failed",
			rttMs: u
		};
	} catch (e) {
		return r.warn("preflight: connectivity probe threw", { error: e instanceof Error ? e.message : String(e) }), {
			transport: "failed",
			rttMs: null
		};
	} finally {
		try {
			a?.close();
		} catch {}
	}
}
function zu(e, t) {
	let n = [], r;
	return e.transport === "failed" ? (r = "critical", n.push("Could not establish any WebRTC connectivity (no ICE candidates gathered). Real-time streaming is unlikely to work on this network.")) : e.transport === "relay" ? (r = "poor", n.push("Direct UDP connectivity could not be confirmed; the session will need a TURN relay, which adds latency and can't be verified without starting a session.")) : e.rttMs != null && e.rttMs > t.marginalMs ? (r = "poor", n.push(`Network round-trip time is high (~${e.rttMs}ms > ${t.marginalMs}ms); the real-time experience may feel laggy.`)) : e.rttMs != null && e.rttMs > t.goodMs ? (r = "fair", n.push(`Network round-trip time is elevated (~${e.rttMs}ms > ${t.goodMs}ms).`)) : r = "good", {
		quality: r,
		metrics: {
			transport: e.transport,
			rttMs: e.rttMs
		},
		reasons: n
	};
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/browser/preflight.js
function Bu(e, t) {
	let n = [];
	if (e.transport === "failed") return {
		quality: "critical",
		metrics: e,
		reasons: ["Could not establish a realtime session for the deep probe."]
	};
	let r = [];
	if (e.ttffMs != null) {
		let i = t.ttff, a = $(e.ttffMs, i.goodMs, i.fairMs, i.poorMs);
		r.push(a), a !== "good" && n.push(`Time to first frame is ~${(e.ttffMs / 1e3).toFixed(1)}s (good ≤ ${(i.goodMs / 1e3).toFixed(0)}s); the session is slow to start.`);
	}
	if (e.g2gMs != null) {
		let i = t.glassToGlass, a = $(e.g2gMs, i.goodMs, i.fairMs, i.poorMs);
		r.push(a), a !== "good" && n.push(`Mid-stream glass-to-glass latency is ~${e.g2gMs}ms (good ≤ ${i.goodMs}ms); the real-time experience may feel laggy.`);
	}
	if (e.ttffMs == null && e.g2gMs == null && (e.rttMs == null ? n.push("The probe connected but could not measure latency (no frame metadata and no RTT sample).") : (n.push("Could not measure glass-to-glass latency during the probe (no frame metadata); using network RTT instead."), r.push($(e.rttMs, t.rtt.goodMs, t.rtt.fairMs, t.rtt.poorMs)))), e.g2gDropRatio != null) {
		let i = t.g2gDrop, a = $(e.g2gDropRatio, i.good, i.fair, i.poor);
		r.push(a), a !== "good" && n.push(`End-to-end frame drop ratio is ${(e.g2gDropRatio * 100).toFixed(1)}% (good ≤ ${i.good * 100}%).`);
	}
	if (e.packetLoss != null) {
		let i = t.loss, a = $(e.packetLoss, i.good, i.fair, i.poor);
		r.push(a), a !== "good" && n.push(`Upstream packet loss is ${(e.packetLoss * 100).toFixed(1)}% (good ≤ ${i.good * 100}%).`);
	}
	return r.length === 0 ? {
		quality: "fair",
		metrics: e,
		reasons: n
	} : {
		quality: au(...r),
		metrics: e,
		reasons: n
	};
}
function Vu(e) {
	if (!e) return {
		transport: "udp",
		rttMs: null,
		g2gMs: null,
		ttffMs: null,
		g2gDropRatio: null,
		upstreamJitterMs: null,
		packetLoss: null,
		sampleCount: 0
	};
	let t = su(e);
	return {
		transport: t.isRelayed ? "relay" : "udp",
		rttMs: t.rttMs == null ? null : Math.round(t.rttMs),
		g2gMs: t.g2gMs,
		ttffMs: t.ttffMs,
		g2gDropRatio: t.g2gDropRatio,
		upstreamJitterMs: t.upstreamJitterMs == null ? null : Math.round(t.upstreamJitterMs),
		packetLoss: t.fractionLost,
		sampleCount: e.glassToGlass?.sampleCount ?? 0
	};
}
function Hu(e, t, n) {
	if (typeof document > "u") throw Error("deep connectivity probe requires a DOM environment (document is undefined)");
	let r = document.createElement("canvas");
	r.width = e, r.height = t;
	let i = r.getContext("2d");
	if (!i) throw Error("deep connectivity probe: 2D canvas context unavailable");
	if (typeof r.captureStream != "function") throw Error("deep connectivity probe: canvas.captureStream unavailable");
	let a = null, o = 0, s = () => {
		o++, i.fillStyle = `hsl(${o % 360}, 60%, 50%)`, i.fillRect(0, 0, r.width, r.height), i.fillStyle = "white", i.fillRect(o * 7 % r.width, 48, 96, 96), a = requestAnimationFrame(s);
	};
	a = requestAnimationFrame(s);
	let c = r.captureStream(n);
	return {
		stream: c,
		dispose: () => {
			a !== null && cancelAnimationFrame(a);
			for (let e of c.getTracks()) e.stop();
		}
	};
}
var Uu = {
	quality: "fair",
	metrics: {
		transport: "failed",
		rttMs: null,
		g2gMs: null,
		ttffMs: null,
		g2gDropRatio: null,
		upstreamJitterMs: null,
		packetLoss: null,
		sampleCount: 0
	},
	reasons: ["Deep connectivity probe aborted."]
};
function Wu(e, t) {
	if (!t) return e;
	if (t.aborted) throw t.reason ?? Gu();
	return Promise.race([e, new Promise((e, n) => {
		t.addEventListener("abort", () => n(t.reason ?? Gu()), { once: !0 });
	})]);
}
function Gu() {
	let e = globalThis.DOMException;
	if (typeof e == "function") return new e("Aborted", "AbortError");
	let t = /* @__PURE__ */ Error("Aborted");
	return t.name = "AbortError", t;
}
function Ku(e, t, n, r) {
	return new Promise((i) => {
		let a = performance.now(), o = () => {
			if (r?.aborted || (e()?.glassToGlass?.sampleCount ?? 0) >= t || performance.now() - a >= n) return i();
			setTimeout(o, 200);
		};
		setTimeout(o, 200);
	});
}
async function qu(e) {
	let { connect: t, logger: n, model: r, durationMs: i, signal: a } = e, o = Q.observability.connectionQuality, s, c, l = null;
	if (a?.aborted) return Uu;
	try {
		s = Hu(r.width, r.height, gl(r.fps));
		let e = t(s.stream, {
			model: r,
			onRemoteStream: () => {}
		});
		if (a?.addEventListener("abort", () => e.then((e) => e.disconnect()).catch(() => {}), { once: !0 }), c = await Wu(e, a), c.on("stats", (e) => {
			l = e;
		}), await Ku(() => l, Q.preflight.active.minSamples, i, a), a?.aborted) return Uu;
	} catch (e) {
		return a?.aborted ? Uu : (n.warn("deep connectivity probe failed", { error: e instanceof Error ? e.message : String(e) }), Bu({
			transport: "failed",
			rttMs: null,
			g2gMs: null,
			g2gDropRatio: null,
			upstreamJitterMs: null,
			packetLoss: null,
			sampleCount: 0
		}, o));
	} finally {
		c?.disconnect(), s?.dispose();
	}
	return Bu(Vu(l), o);
}
var Ju = Q.preflight.defaultStunUrls.map((e) => ({ urls: e })), Yu = ({ logger: e, connect: t }) => ({ checkConnectivity: async (n = {}) => {
	if (n.deep) {
		if (!t) throw Error("deep connectivity probe is unavailable (realtime client not wired)");
		if (!n.model) throw Error("deep connectivity probe requires a `model` (latency is model-specific)");
		return qu({
			connect: t,
			logger: e,
			model: n.model,
			durationMs: n.durationMs ?? Q.preflight.active.durationMs,
			signal: n.signal
		});
	}
	return zu(await Ru(n.iceServers ?? Ju, n.iceGatherTimeoutMs ?? Q.preflight.iceGatherTimeoutMs, n.signal, e), Q.preflight.rtt);
} });
//#endregion
//#region web/node_modules/@decartai/sdk/dist/utils/platform.js
function Xu() {
	let e = globalThis, t = e?.navigator?.userAgent ?? "", n = e?.navigator?.platform ?? "", r = e?.navigator?.maxTouchPoints ?? 0;
	return !(!/^((?!chrome|chromium|crios|fxios|edg|firefox|opr|opera|android).)*safari/i.test(t) || /iPad|iPhone|iPod/.test(t) || n === "MacIntel" && r > 1);
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/media-channel.js
var Zu = "x-google-start-bitrate";
function Qu(e, t) {
	let n = `${Zu}=${t}`;
	return e.split(/(?=^m=)/m).map((e) => {
		if (!e.startsWith("m=video")) return e;
		let t = new Set(Array.from(e.matchAll(/^a=fmtp:(\d+) /gm), (e) => e[1]));
		return e.replace(/^a=fmtp:\d+ [^\r\n]*/gm, (e) => e.includes(Zu) ? e : `${e};${n}`).replace(/^a=rtpmap:(\d+) (?!rtx|red|ulpfec|flexfec)[^\r\n]*(\r?\n)/gim, (e, r, i) => t.has(r) ? e : `${e}a=fmtp:${r} ${n}${i}`);
	}).join("");
}
function $u(e) {
	return (e ?? Q.livekit.defaultVideoCodec) !== "vp9";
}
function ed(e) {
	let { minVideoBitrateBps: t, simulcastLowerLayersBitrateBps: n, bweVideoShare: r } = Q.livekit, i = $u(e) ? n : 0;
	return Math.round((t + i) / r / 1e3);
}
function td(e, t, n = !1) {
	let r = t ?? Q.livekit.defaultVideoCodec, i = r === "vp9" ? Q.livekit.vp9MaxVideoBitrateBps : Q.livekit.defaultMaxVideoBitrateBps;
	return {
		source: e,
		videoCodec: r,
		simulcast: $u(r),
		videoEncoding: {
			maxBitrate: i,
			maxFramerate: Q.livekit.defaultPublishFps
		},
		...n ? { frameMetadata: { timestamp: !0 } } : {}
	};
}
var nd = class {
	config;
	room = null;
	cameraTrackSource = null;
	remoteStream = null;
	frameMetadataEnabled = !1;
	events = wl();
	logger;
	constructor(e) {
		this.config = e, this.logger = e.logger ?? S("warn");
	}
	get localStream() {
		return this.config.localStream;
	}
	on(e, t) {
		this.events.on(e, t);
	}
	off(e, t) {
		this.events.off(e, t);
	}
	async connect(e) {
		let { Room: t, RoomEvent: n, Track: r } = await ru();
		if (this.cameraTrackSource = r.Source.Camera, !this.room) {
			let e;
			if (this.config.createFrameMetadataWorker) try {
				e = this.config.createFrameMetadataWorker();
			} catch (e) {
				let t = e instanceof Error ? e.message : String(e);
				throw this.logger.warn("Failed to create LiveKit frame-metadata worker", { error: t }), Error(`Failed to create LiveKit frame-metadata worker: ${t}`, { cause: e });
			}
			this.frameMetadataEnabled = e !== void 0;
			try {
				this.room = new t({
					...Q.livekit.roomOptions,
					...e ? { frameMetadata: { worker: e } } : {}
				});
			} catch (t) {
				throw e?.terminate(), this.frameMetadataEnabled = !1, t;
			}
		}
		let i = this.room;
		i.on(n.TrackSubscribed, (e, t, n) => {
			if (!n.identity.startsWith(Q.livekit.inferenceServerIdentityPrefix) || e.kind !== "video" && e.kind !== "audio") return;
			let r = e.mediaStreamTrack;
			if (r) {
				e.kind === "video" && this.config.observability?.attachRemoteVideoTrack(e);
				let t = this.remoteStream?.getTracks() ?? [];
				t.includes(r) || t.push(r), this.remoteStream = new MediaStream(t), this.events.emit("remoteStream", this.remoteStream);
			}
		}), i.on(n.Disconnected, (e) => {
			this.logger.warn("livekit: room disconnected", { reason: e }), this.events.emit("disconnected", { reason: e });
		}), this.config.observability?.startPhase("webrtc-handshake"), await i.connect(e.url, e.token), this.config.observability?.endPhase("webrtc-handshake", { success: !0 }), this.seedStartBitrate(i), this.config.observability?.setLiveKitRoom(i);
	}
	async publishLocalTracks() {
		this.config.localStream && (this.config.observability?.startPhase("publish-local-track"), await this.publishTracks(this.config.localStream), this.config.observability?.endPhase("publish-local-track", { success: !0 }));
	}
	async replaceVideoTrack(e) {
		let t = this.room;
		if (!t) throw Error("Cannot replace video track: media channel is not connected");
		let n = [...t.localParticipant.videoTrackPublications.values()][0]?.videoTrack;
		if (!n) throw Error("Cannot replace video track: no published video track");
		await n.replaceTrack(e);
	}
	disconnect() {
		let e = this.room;
		this.room = null, this.cameraTrackSource = null, this.remoteStream = null, this.frameMetadataEnabled = !1, this.config.observability?.setLiveKitRoom(null), e && e.disconnect().catch(() => {});
	}
	seedStartBitrate(e) {
		let t = e.engine?.pcManager?.publisher, n = t?.setRemoteDescription;
		if (!t || typeof n != "function") return;
		let r = ed(this.config.videoCodec);
		t.setRemoteDescription = (e, i) => n.call(t, e.type === "answer" && e.sdp ? {
			type: e.type,
			sdp: Qu(e.sdp, r)
		} : e, i);
	}
	async publishTracks(e) {
		if (this.room) for (let t of e.getTracks()) if (t.kind === "video") {
			if (!this.cameraTrackSource) throw Error("Cannot publish video track: media channel is not connected");
			await this.room.localParticipant.publishTrack(t, td(this.cameraTrackSource, this.config.videoCodec, this.frameMetadataEnabled));
		} else await this.room.localParticipant.publishTrack(t);
	}
}, rd = (e) => new nd(e);
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/browser/mirror-stream.js
function id() {
	return typeof globalThis < "u" && typeof globalThis.MediaStreamTrackProcessor == "function" && typeof globalThis.MediaStreamTrackGenerator == "function";
}
function ad(e) {
	if (e.kind !== "video") return !1;
	let t;
	try {
		t = e.getSettings?.().facingMode;
	} catch {
		return !1;
	}
	return t === "user";
}
function od(e, t) {
	let [n] = e.getVideoTracks(), r = e.getAudioTracks();
	return n ? id() ? cd(n, r, t.transform) : ld(n, r, t.fps, t.transform) : {
		stream: e,
		dispose: () => {},
		impl: "noop"
	};
}
function sd(e, t) {
	return od(e, {
		fps: t.fps,
		transform: (e, t, n, r) => {
			e.save(), e.setTransform(-1, 0, 0, 1, n, 0), e.drawImage(t, 0, 0, n, r), e.restore();
		}
	});
}
function cd(e, t, n) {
	let r = globalThis.MediaStreamTrackProcessor, i = globalThis.MediaStreamTrackGenerator;
	if (!new OffscreenCanvas(1, 1).getContext("2d")) throw Error("createFrameTransformPump: OffscreenCanvas 2D context unavailable");
	let a = new r({ track: e }), o = new i({ kind: "video" }), s = new OffscreenCanvas(1, 1), c = s.getContext("2d"), l = new TransformStream({ transform(e, t) {
		let r = e.displayWidth, i = e.displayHeight;
		(s.width !== r || s.height !== i) && (s = new OffscreenCanvas(r, i), c = s.getContext("2d"));
		let a;
		try {
			n(c, e, r, i), a = new VideoFrame(s, {
				timestamp: e.timestamp,
				alpha: "discard"
			}), t.enqueue(a), a = void 0;
		} finally {
			a?.close(), e.close();
		}
	} });
	a.readable.pipeThrough(l).pipeTo(o.writable).catch(() => {});
	let u = !1;
	return {
		stream: new MediaStream([o, ...t]),
		impl: "track-processor",
		dispose: () => {
			u || (u = !0, o.stop());
		}
	};
}
function ld(e, t, n, r) {
	if (typeof document > "u") throw Error("createFrameTransformPump requires a DOM environment (document is undefined)");
	let i = document.createElement("canvas"), a = i.getContext("2d");
	if (!a) throw Error("createFrameTransformPump: 2D canvas context unavailable");
	if (typeof i.captureStream != "function") throw Error("createFrameTransformPump: canvas.captureStream unavailable");
	let [o] = i.captureStream(n).getVideoTracks();
	if (!o) throw Error("createFrameTransformPump: canvas.captureStream produced no video track");
	let s = document.createElement("video");
	s.muted = !0, s.playsInline = !0, s.autoplay = !0, s.srcObject = new MediaStream([e]);
	let c = !1, l = null, u = () => {
		if (c) return;
		let e = s.videoWidth, t = s.videoHeight;
		e > 0 && t > 0 && (i.width !== e && (i.width = e), i.height !== t && (i.height = t), r(a, s, e, t)), l = requestAnimationFrame(u);
	};
	return s.play().catch(() => {}), l = requestAnimationFrame(u), {
		stream: new MediaStream([o, ...t]),
		impl: "canvas",
		dispose: () => {
			c || (c = !0, l !== null && cancelAnimationFrame(l), o.stop(), s.srcObject = null);
		}
	};
}
//#endregion
//#region web/node_modules/@decartai/sdk/dist/realtime/browser/prepare-connection.js
var ud = ({ stream: e, mirror: t, preferredVideoCodec: n, fps: r, logger: i, observability: a }) => {
	let o = e ?? new MediaStream(), s = () => {};
	if (t !== !1) try {
		let e = o.getVideoTracks?.()[0];
		if (e && (t === !0 || ad(e))) {
			let e = sd(o, { fps: r });
			o = e.stream, s = e.dispose;
		} else t === !0 && !e && i.warn("mirror: true requested but no video track was found on the input stream");
	} catch (e) {
		i.warn("Failed to mirror input stream; falling back to un-mirrored input", { error: e instanceof Error ? e.message : String(e) });
	}
	let c;
	if (Fu()) try {
		c = Nu();
	} catch (e) {
		i.debug("Frame-metadata worker unavailable; glass-to-glass latency measurement disabled", { error: e instanceof Error ? e.message : String(e) });
	}
	else i.debug("Frame-metadata runtime unavailable; glass-to-glass latency measurement disabled");
	let l = c !== void 0, u = () => {
		if (c) {
			let e = c;
			return c = void 0, e;
		}
		return Nu();
	}, d = new vu({
		...a,
		glassToGlass: l ? ju() : void 0
	}), f = Xu() ? "vp8" : void 0;
	return {
		stream: o,
		observability: d,
		frameTiming: l,
		videoCodec: f ?? n,
		queryParams: { ...f ? { livekit_server_codec: f } : {} },
		createMediaChannel: (e) => rd({
			...e,
			createFrameMetadataWorker: l ? u : void 0
		}),
		dispose: () => {
			s(), c?.terminate();
		}
	};
}, dd = (e) => {
	let t = eu({
		baseUrl: e.publishBaseUrl,
		apiKey: e.apiKey,
		integration: e.integration,
		logger: e.logger,
		telemetryEnabled: e.telemetryEnabled,
		prepareConnection: ud
	}), n = wu({
		baseUrl: e.subscribeBaseUrl,
		apiKey: e.apiKey,
		integration: e.integration,
		logger: e.logger,
		createFrameMetadataWorker: Nu,
		isFrameMetadataRuntimeSupported: Fu
	}), r = Yu({
		logger: e.logger,
		connect: t.connect
	});
	return {
		connect: (e, n) => t.connect(e, n),
		subscribe: n.subscribe,
		checkConnectivity: r.checkConnectivity
	};
}, fd = (e = {}) => il(dd, e), pd = {
	shirt: {
		label: "Shirt",
		limit: 1
	},
	jeans: {
		label: "Jeans",
		limit: 1
	},
	accessories: {
		label: "Accessories",
		limit: 4
	}
};
function md(e, t, n) {
	return e.category === "accessories" ? `Accessory ${n.slice(0, t + 1).filter((e) => e.category === "accessories").length}` : pd[e.category].label;
}
async function hd(e) {
	if (!e.length) return null;
	let t = Math.min(e.length, 2), n = document.createElement("canvas");
	n.width = t * 512, n.height = Math.ceil(e.length / t) * 512;
	let r = n.getContext("2d");
	r.fillStyle = "#ffffff", r.fillRect(0, 0, n.width, n.height);
	for (let n = 0; n < e.length; n++) {
		let i = await createImageBitmap(e[n].file);
		try {
			let a = n % t * 512, o = Math.floor(n / t) * 512;
			r.fillStyle = "#e9ede2", r.fillRect(a, o, 512, 52), r.fillStyle = "#20352c", r.font = "bold 24px sans-serif", r.fillText(md(e[n], n, e), a + 20, o + 34);
			let s = Math.min(472 / i.width, 420 / i.height), c = i.width * s, l = i.height * s;
			r.drawImage(i, a + (512 - c) / 2, o + 62 + (430 - l) / 2, c, l);
		} finally {
			i.close();
		}
	}
	return new Promise((e, t) => n.toBlob((n) => n ? e(n) : t(/* @__PURE__ */ Error("Could not prepare the outfit reference.")), "image/png"));
}
//#endregion
//#region web/tryon-sdk.js
async function gd(e, t) {
	let n = [];
	for (let r of e.filter((e) => e.source === "shop")) {
		if (!/^\/api\/clothing\/image\/[A-Za-z0-9_-]+$/.test(r.reference_image || "")) throw Error(`No product photo for ${r.name}. Choose another item.`);
		let e = await fetch(r.reference_image, { signal: t });
		if (!e.ok) throw Error(`Could not prepare a clothing-only photo for ${r.name}. Choose another product.`);
		n.push({
			file: await e.blob(),
			category: r.category === "Bottoms" ? "jeans" : r.category === "Accessories" ? "accessories" : "shirt"
		});
	}
	return hd(n);
}
async function _d({ apiKey: e, stream: t, items: n, signal: r, occasion: i = "", onRemoteStream: a, onConnectionChange: o }) {
	let s = await gd(n, r);
	r?.throwIfAborted();
	let c = fd({ apiKey: e }), l = n.map((e) => e.source === "shop" ? `${e.category}: ${e.brand || ""} ${e.name} (match its product reference photo)` : `${e.color} (${e.hex}) ${e.name}`).join("; "), u = [];
	n.some((e) => ["Tops", "Layers"].includes(e.category)) || u.push("upper-body clothing"), n.some((e) => e.category === "Bottoms") || u.push("pants"), n.some((e) => e.category === "Accessories") || u.push("accessories");
	let d = n.filter((e) => ["Tops", "Layers"].includes(e.category)).map((e) => e.name), f = d.length > 1 ? ` Layer tops from innermost to outermost in this order: ${d.join(", ")}.` : "", p = `Style the person in this complete selection together: ${l}. ` + (s ? "The labeled reference board shows the selected store products. Match their garment colors, patterns, logos and shapes. Do not render the board, labels, or people from reference photos. " : "") + f + "Change only the selected clothing and accessories. Preserve the camera person’s exact face, facial features, skin tone, hair, expression and identity in every frame. Never generate a replacement face or copy any reference person. Keep body shape, pose, and surroundings unchanged. Natural fabric, realistic lighting." + (i ? ` Occasion context: ${i}. Keep the selected garments unchanged by this context.` : "") + (u.length ? ` Keep their existing ${u.join(", ")} unchanged.` : "");
	return c.realtime.connect(t, {
		model: yl.realtime("lucy-2.5"),
		onRemoteStream: a,
		onConnectionChange: o,
		initialState: {
			...s ? { image: s } : {},
			prompt: {
				text: p,
				enhance: !1
			}
		}
	});
}
//#endregion
export { _d as connectTryOn, gd as productReference };

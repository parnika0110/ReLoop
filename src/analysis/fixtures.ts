/**
 * Representative raw-model-output fixtures for laptop / smartphone / tablet.
 *
 * Used by unit tests and the mock provider. They mimic what a vision model
 * legitimately returns — including nulls for unobservable fields and honest
 * confidence levels — so validation and UI are exercised against realistic
 * shapes rather than idealised ones.
 */
export interface RawModelFixture {
  name: string;
  payload: Record<string, unknown>;
}

export const FIXTURES: Record<"laptop" | "smartphone" | "tablet", RawModelFixture> = {
  laptop: {
    name: "laptop-well-used",
    payload: {
      deviceType: "laptop",
      brand: "Lenovo",
      model: null, // model not legible in the photo — do not invent
      estimatedAge: 4,
      condition: 72,
      repairability: 84,
      reusePotential: 78,
      resalePotential: 58,
      materialRecoveryPotential: 65,
      observedIssues: [
        { id: "worn_keys", label: "Keycaps visibly worn", severity: "minor" },
        { id: "battery_swelling_suspected", label: "Bottom case slightly lifted near trackpad", severity: "moderate" },
      ],
      confidence: 74,
    },
  },
  smartphone: {
    name: "smartphone-cracked",
    payload: {
      deviceType: "smartphone",
      brand: "Apple",
      model: "iPhone", // family legible from design; exact model not confirmed
      estimatedAge: 3,
      condition: 41,
      repairability: 55,
      reusePotential: 38,
      resalePotential: 24,
      materialRecoveryPotential: 71,
      observedIssues: [
        { id: "cracked_screen", label: "Cracked front glass", severity: "critical" },
        { id: "scuffed_frame", label: "Deep scuffs on frame", severity: "minor" },
      ],
      confidence: 86,
    },
  },
  tablet: {
    name: "tablet-like-new",
    payload: {
      deviceType: "tablet",
      brand: null, // no logo visible — unknown, not guessed
      model: null,
      estimatedAge: null, // age not inferable from the image
      condition: 91,
      repairability: 48,
      reusePotential: 93,
      resalePotential: 82,
      materialRecoveryPotential: 54,
      observedIssues: [],
      confidence: 62, // moderate confidence: no branding visible
    },
  },
};

/** Fixture payload declaring the image is insufficient — the honest-refusal path. */
export const INSUFFICIENT_FIXTURE: RawModelFixture = {
  name: "insufficient-blurry",
  payload: {
    insufficient: true,
    reason: "The image is heavily blurred; no device edges, ports, or screens are identifiable.",
    missing: ["device outline", "screen", "brand markings"],
  },
};

/** Fixture with an unsupported device — exercises the rejection path. */
export const UNSUPPORTED_FIXTURE: RawModelFixture = {
  name: "unsupported-microwave",
  payload: {
    deviceType: "microwave",
    brand: "Panasonic",
    model: null,
    estimatedAge: null,
    condition: 80,
    repairability: 60,
    reusePotential: 70,
    resalePotential: 40,
    materialRecoveryPotential: 50,
    observedIssues: [],
    confidence: 70,
  },
};

/** Fixture with out-of-range numbers — exercises malformed rejection. */
export const MALFORMED_FIXTURE: RawModelFixture = {
  name: "malformed-out-of-range",
  payload: {
    ...FIXTURES.laptop.payload,
    condition: 142, // outside 0–100 → must be rejected, not clamped
  },
};

import assert from "node:assert/strict";

import {
  APPROVAL_ID,
  CANDIDATE_VERSIONS,
  PREDICATE_MANIFEST,
  createBlockedBeforeRemoteResult,
  reduceStrictSourceEquivalenceCliResult
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs";
import {
  allPassParts,
  allPassStatuses,
  allPassTransientMatrix,
  classificationFixtures,
  expectedApprovalId,
  gateAbortMappings,
  gateFields,
  manifests,
  rawSentinel,
  sqlKeys,
  versions
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";
import {
  allPassRow,
  invalidInterfaceStdoutFixtures,
  remoteFailureFixtures,
  unknownCountFixtures
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-interface-fixtures.mjs";
import {
  assertBlockedResult,
  assertCompleteResult,
  assertPostRemoteBlockedResult,
  createSqlRow,
  reduceRow,
  replaceMatrixPart,
  runNamedFixture,
  serializeParts
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-support.mjs";

function assertReducerInterface() {
  assert.equal(APPROVAL_ID, expectedApprovalId);
  assert.deepEqual(CANDIDATE_VERSIONS, versions);
  assert.deepEqual(PREDICATE_MANIFEST, manifests);
  assert.equal(typeof reduceStrictSourceEquivalenceCliResult, "function");
  assert.equal(typeof createBlockedBeforeRemoteResult, "function");
  assert.equal(Object.isFrozen(CANDIDATE_VERSIONS), true);
  assert.equal(Object.isFrozen(PREDICATE_MANIFEST), true);
  for (const manifest of PREDICATE_MANIFEST) {
    assert.equal(Object.isFrozen(manifest), true);
    assert.equal(Object.isFrozen(manifest.categories), true);
    for (const category of manifest.categories) {
      assert.equal(Object.isFrozen(category), true);
    }
  }
}

function assertAllPassResult() {
  assert.equal(serializeParts(allPassParts), allPassTransientMatrix);
  // Property insertion order is a deliberate transient-interface contract.
  assert.deepEqual(Object.keys(allPassRow), sqlKeys);
  const result = reduceRow(allPassRow);
  assertCompleteResult(result, allPassStatuses, allPassTransientMatrix);
  assert.deepEqual(
    result.strict_source_equivalence_matrix,
    manifests.map((manifest) => ({
      version: manifest.version,
      overall_status: "canonical-effect-equivalent",
      categories: manifest.categories.map(([label]) => ({
        label,
        status: "pass"
      }))
    }))
  );
}

function assertClassificationFixtures() {
  for (const fixture of classificationFixtures) {
    runNamedFixture(fixture, () => {
      const targetIndex = versions.indexOf(fixture.version);
      const targetManifest = manifests[targetIndex];
      assert.equal(fixture.vector.length, targetManifest.length);
      const matrix = replaceMatrixPart(targetIndex, {
        relationState: fixture.relationState,
        conflictState: fixture.conflictState,
        vector: fixture.vector
      });
      const expectedStatuses = allPassStatuses.map((status, index) =>
        index === targetIndex ? fixture.expectedStatus : status
      );
      const result = reduceRow(
        createSqlRow({ matrix, statuses: expectedStatuses })
      );
      if (fixture.expectedStatus === "unverifiable") {
        assertPostRemoteBlockedResult(
          result,
          {
            executionStatus: "blocked-unverifiable",
            abortStatus: "triggered-unverifiable",
            sanitizedOutputReviewStatus: "pass"
          }
        );
        return;
      }
      assert.equal(
        fixture.expectedCategoryStatuses.length,
        targetManifest.categories.length
      );
      const expectedCategories = targetManifest.categories.map(
        ([label], categoryIndex) => ({
          label,
          status: fixture.expectedCategoryStatuses[categoryIndex]
        })
      );
      assertCompleteResult(result, expectedStatuses, matrix);
      assert.deepEqual(
        result.strict_source_equivalence_matrix[targetIndex].categories,
        expectedCategories,
        "category slices must match the explicit fixture oracle"
      );
      assert.equal(
        result.strict_source_equivalence_matrix[targetIndex].overall_status,
        fixture.expectedStatus,
        "the closed truth table must classify the fixture"
      );
    });
  }
}

function assertRemoteFailures() {
  for (const fixture of remoteFailureFixtures) {
    runNamedFixture(fixture, () => {
      const result = reduceStrictSourceEquivalenceCliResult(fixture.input);
      assertPostRemoteBlockedResult(
        result,
        {
          executionStatus: "blocked-remote-read-failed",
          abortStatus: "triggered-remote-read-failed",
          sanitizedOutputReviewStatus: "not-evaluated"
        }
      );
    });
  }
}

function assertInvalidInterfaceFixtures() {
  for (const fixture of invalidInterfaceStdoutFixtures) {
    runNamedFixture(fixture, () => {
      const result = reduceStrictSourceEquivalenceCliResult({
        status: 0,
        timedOut: false,
        stdout: fixture.stdout,
        stderr: rawSentinel
      });
      assertPostRemoteBlockedResult(
        result,
        {
          executionStatus: "blocked-sanitized-output-invalid",
          abortStatus: "triggered-sanitized-output-invalid",
          sanitizedOutputReviewStatus: "fail"
        }
      );
    });
  }
}

function assertUnknownCountFixtures() {
  for (const fixture of unknownCountFixtures) {
    runNamedFixture(fixture, () => {
      const result = reduceRow(fixture.row);
      assertPostRemoteBlockedResult(
        result,
        {
          executionStatus: "blocked-unknown-remote-count-changed",
          abortStatus: "triggered-unknown-remote-count-changed",
          sanitizedOutputReviewStatus: "fail"
        }
      );
    });
  }
}

function assertPreRemoteMappings() {
  for (const [failedGateIndex, [gateId, abortStatus]] of
    gateAbortMappings.entries()) {
    const fixture = { name: `pre-remote mapping ${gateId}` };
    runNamedFixture(fixture, () => {
      const result = createBlockedBeforeRemoteResult(gateId, rawSentinel);
      const expectedGateStatuses = Object.fromEntries(
        gateFields.map(([, field], gateIndex) => [
          field,
          gateIndex < failedGateIndex
            ? "pass"
            : gateIndex === failedGateIndex
              ? "fail"
              : "not-evaluated"
        ])
      );
      assertBlockedResult(result, {
        executionStatus: "blocked-before-remote",
        abortStatus,
        sanitizedOutputReviewStatus: "not-evaluated",
        remoteReadAttemptCount: 0,
        defaultPrivilegesStatus: "not-evaluated",
        gateStatuses: expectedGateStatuses
      });
    });
  }
}

export function runStrictSourceEquivalenceProofContract() {
  assertReducerInterface();
  assertAllPassResult();
  assertClassificationFixtures();
  assertRemoteFailures();
  assertInvalidInterfaceFixtures();
  assertUnknownCountFixtures();
  assertPreRemoteMappings();
}

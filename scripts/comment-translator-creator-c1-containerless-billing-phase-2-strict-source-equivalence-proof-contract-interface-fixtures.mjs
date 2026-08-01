// allow: SIZE_OK — pure declarative sanitized-interface fixture data.
import {
  allPassStatuses,
  allPassTransientMatrix,
  classificationCountKeys,
  rawSentinel,
  sqlKeys
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";
import {
  createSqlRow,
  replaceMatrixPart
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-support.mjs";

export const allPassRow = createSqlRow({
  matrix: allPassTransientMatrix,
  statuses: allPassStatuses
});

export const remoteFailureFixtures = [
  {
    name: "nonzero CLI status",
    input: {
      status: 1,
      timedOut: false,
      stdout: rawSentinel,
      stderr: rawSentinel
    }
  },
  {
    name: "timeout state despite a zero status",
    input: {
      status: 0,
      timedOut: true,
      stdout: rawSentinel,
      stderr: rawSentinel
    }
  }
];

export const invalidInterfaceStdoutFixtures = [
  {
    name: "invalid JSON",
    stdout: rawSentinel
  },
  {
    name: "non-array JSON",
    stdout: JSON.stringify({ sentinel: rawSentinel })
  },
  {
    name: "Supabase CLI agent envelope",
    stdout: JSON.stringify({
      boundary: rawSentinel,
      rows: [allPassRow],
      warning: rawSentinel
    })
  },
  {
    name: "zero rows",
    stdout: JSON.stringify([])
  },
  {
    name: "multiple rows",
    stdout: JSON.stringify([allPassRow, allPassRow])
  },
  {
    name: "NULL row",
    stdout: JSON.stringify([null])
  },
  {
    name: "primitive row",
    stdout: JSON.stringify([42])
  },
  {
    name: "array row",
    stdout: JSON.stringify([[]])
  },
  {
    name: "missing SQL column",
    stdout: JSON.stringify([
      Object.fromEntries(
        Object.entries(allPassRow).filter(([key]) => key !== "partial_count")
      )
    ])
  },
  {
    name: "extra SQL column",
    stdout: JSON.stringify([{ ...allPassRow, extra: rawSentinel }])
  },
  {
    name: "reordered SQL columns",
    stdout: JSON.stringify([{
      absent_count: allPassRow.absent_count,
      strict_source_equivalence_matrix:
        allPassRow.strict_source_equivalence_matrix,
      canonical_effect_equivalent_count:
        allPassRow.canonical_effect_equivalent_count,
      partial_count: allPassRow.partial_count,
      conflicting_count: allPassRow.conflicting_count,
      unverifiable_count: allPassRow.unverifiable_count,
      unknown_remote_migration_count:
        allPassRow.unknown_remote_migration_count
    }])
  },
  {
    name: "duplicate raw SQL key cannot overwrite a private sentinel",
    stdout:
      `[{\"strict_source_equivalence_matrix\":${JSON.stringify(rawSentinel)},`
      + `${JSON.stringify(allPassRow).slice(1)}]`
  },
  {
    name: "escaped raw SQL key alias is noncanonical",
    stdout: JSON.stringify([allPassRow]).replace(
      "\"strict_source_equivalence_matrix\"",
      "\"\\u0073trict_source_equivalence_matrix\""
    )
  },
  ...sqlKeys.map((key) => ({
    name: `NULL SQL column ${key}`,
    stdout: JSON.stringify([{ ...allPassRow, [key]: null }])
  })),
  ...sqlKeys.map((key) => ({
    name: `ill-typed SQL column ${key}`,
    stdout: JSON.stringify([{
      ...allPassRow,
      [key]:
        key === "strict_source_equivalence_matrix"
          ? 27
          : String(allPassRow[key])
    }])
  })),
  {
    name: "negative classification count",
    stdout: JSON.stringify([{
      ...allPassRow,
      canonical_effect_equivalent_count: -1
    }])
  },
  {
    name: "fractional classification count",
    stdout: JSON.stringify([{ ...allPassRow, absent_count: 0.5 }])
  },
  {
    name: "same-length unknown version identifier",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        version: "20260623000001"
      })
    }])
  },
  {
    name: "wrong version order",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: [
        allPassTransientMatrix.split("|")[1],
        allPassTransientMatrix.split("|")[0],
        ...allPassTransientMatrix.split("|").slice(2)
      ].join("|")
    }])
  },
  {
    name: "wrong predicate-vector length",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        vector: "p".repeat(26)
      })
    }])
  },
  {
    name: "predicate-vector character outside p-f-u",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        vector: `${"p".repeat(26)}x`
      })
    }])
  },
  {
    name: "legacy overall alias missing",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        relationState: "missing"
      })
    }])
  },
  {
    name: "legacy overall alias equivalent-present",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        relationState: "equivalent-present"
      })
    }])
  },
  {
    name: "invalid conflict enum",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        conflictState: "detected"
      })
    }])
  },
  {
    name: "not-applicable relation outside default ACL version",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        relationState: "not-applicable"
      })
    }])
  },
  {
    name: "canonical relation on default ACL version",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(3, {
        relationState: "canonical"
      })
    }])
  },
  {
    name: "duplicate version entry",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: [
        allPassTransientMatrix.split("|")[0],
        allPassTransientMatrix.split("|")[0],
        ...allPassTransientMatrix.split("|").slice(2)
      ].join("|")
    }])
  },
  {
    name: "missing version entry",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix:
        allPassTransientMatrix.split("|").slice(0, 3).join("|")
    }])
  },
  {
    name: "extra version entry",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix:
        `${allPassTransientMatrix}|${allPassTransientMatrix.split("|")[3]}`
    }])
  },
  {
    name: "classification count decrement",
    stdout: JSON.stringify([{
      ...allPassRow,
      canonical_effect_equivalent_count: 3
    }])
  },
  {
    name: "balanced SQL status count drift",
    stdout: JSON.stringify([{
      ...allPassRow,
      canonical_effect_equivalent_count: 3,
      partial_count: 1
    }])
  },
  ...classificationCountKeys.map((key) => ({
    name: `SQL status count inconsistent for ${key}`,
    stdout: JSON.stringify([{
      ...allPassRow,
      [key]: allPassRow[key] + 1
    }])
  })),
  {
    name: "invalid matrix outranks unknown remote count change",
    stdout: JSON.stringify([{
      ...allPassRow,
      strict_source_equivalence_matrix: replaceMatrixPart(0, {
        vector: "p".repeat(26)
      }),
      unknown_remote_migration_count: 9
    }])
  }
];

export const unknownCountFixtures = [
  {
    name: "unknown remote migration count decreases to nine",
    row: { ...allPassRow, unknown_remote_migration_count: 9 }
  },
  {
    name: "unknown remote migration count increases to eleven",
    row: { ...allPassRow, unknown_remote_migration_count: 11 }
  },
  {
    name: "unknown count blocker precedes classification count drift",
    row: {
      ...allPassRow,
      canonical_effect_equivalent_count: 5,
      unknown_remote_migration_count: 9
    }
  }
];

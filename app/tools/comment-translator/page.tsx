import type { Metadata } from "next";
import { CommentTranslatorDock } from "@/components/comment-translator/CommentTranslatorDock";
import { PortalShell } from "@/components/portal/PortalShell";
import { createYouTubeOAuthNewClientPayloadCredentialReferenceSource } from "@/lib/comment-translator-youtube-client-safe-credential-reference-source";

export const metadata: Metadata = {
  title: "Kuro Live Comment Translator",
  description:
    "A YouTube-first comment translation preview that keeps provider reads and AI translation behind explicit session start."
};

export const dynamic = "force-dynamic";

const youtubeCredentialReferenceSource = createYouTubeOAuthNewClientPayloadCredentialReferenceSource({
  credentialReferenceId: "ytcred_comment_translator_preview_001",
  statusMetadata: {
    status: "unavailable",
    provider: "youtube",
    reconnectRequired: true,
    providerChannelId: null,
    scopeLabel: null,
    expiresAtIso: null,
    reason: "trusted-adapter-not-wired"
  },
  sourceSurfacingApprovalEvidence: {
    status: "approved",
    approverRole: "authorized-product-or-security-owner",
    approvalStatement:
      "approves-new-client-payload-credentialReferenceId-source-for-comment-translator-source-surfacing-before-implementation",
    targetSource: "new-client-payload-credentialReferenceId-source",
    targetSurface: "/tools/comment-translator",
    targetBoundary: "credentialReferenceId-and-sanitized-status-metadata-only-no-storage-or-handoff-change",
    approvedFor: "display-ui-wiring-after-pr321-readiness",
    approvalEvidenceSource: "user-thread-explicit-approval"
  }
});

export default function CommentTranslatorPage() {
  return (
    <PortalShell mode="workspace">
      <CommentTranslatorDock youtubeCredentialReferenceSource={youtubeCredentialReferenceSource} />
    </PortalShell>
  );
}

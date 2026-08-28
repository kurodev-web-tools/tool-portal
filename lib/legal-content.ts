export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  rows?: Array<{
    label: string;
    value: string;
  }>;
};

export type LegalDocument = {
  eyebrow: string;
  title: string;
  lead: string;
  effectiveDate: string;
  updatedDate: string;
  sections: LegalSection[];
};

const sharedDates = {
  effectiveDate: "2026年5月30日",
  updatedDate: "2026年8月15日"
};

export const legalDocuments = {
  terms: {
    eyebrow: "Terms of Service",
    title: "利用規約",
    lead: "本規約は、KuroDev が提供する Kuro Stream Kit の利用条件を定めるものです。",
    ...sharedDates,
    sections: [
      {
        heading: "第1条（適用）",
        paragraphs: [
          "本規約は、Kuro Stream Kit（以下「本サービス」といいます）で提供する配信準備、画像編集、予定管理、SNS向け画像分割、アカウント、有料プランその他関連機能の利用に適用されます。",
          "利用者は、本サービスを利用することで、本規約に同意したものとみなされます。"
        ]
      },
      {
        heading: "第2条（サービス内容）",
        paragraphs: [
          "本サービスは、VTuber・配信者の活動準備を支援するデジタルツール群です。現時点で利用可能な機能と準備中の機能は、各画面の表示に従います。",
          "一部の機能はベータ版、試験提供、または準備中として提供されることがあり、仕様、保存方式、利用条件、提供有無は変更される場合があります。"
        ]
      },
      {
        heading: "第3条（アカウント）",
        paragraphs: [
          "アカウント機能を利用する場合、利用者は正確なメールアドレスその他必要な情報を登録し、認証情報を自己の責任で管理するものとします。",
          "第三者による不正利用が疑われる場合、または本規約に違反する利用が確認された場合、当方はアカウント停止、機能制限、データ保護のための一時的なアクセス制限を行うことがあります。"
        ]
      },
      {
        heading: "第4条（禁止事項）",
        list: [
          "法令または公序良俗に反する行為",
          "第三者または当方の権利、名誉、信用、プライバシーを侵害する行為",
          "不正アクセス、過度な負荷、脆弱性調査の名目による攻撃的な操作",
          "虚偽情報の登録、なりすまし、アカウントの不正共有",
          "本サービスの運営、提供、セキュリティを妨害する行為",
          "反社会的勢力への利益供与その他これに準ずる行為",
          "当方が不適切と判断する行為"
        ]
      },
      {
        heading: "第5条（出力物と素材の扱い）",
        paragraphs: [
          "利用者が本サービス上で作成、編集、出力した画像、予定文、下書き、設定その他の出力物に関する権利は、利用者または正当な権利者に帰属します。",
          "ただし、本サービス自体の画面、プログラム、標準素材、サンプル文言、デザイン、名称、ロゴその他当方が提供する要素に関する権利は、当方または正当な権利者に帰属します。",
          "利用者は、第三者の権利を侵害しない素材を使用する責任を負います。外部プラットフォームへの投稿、配信、商用利用の可否は、利用者が各プラットフォームや素材提供元の規約を確認してください。"
        ]
      },
      {
        heading: "第6条（保存データ）",
        paragraphs: [
          "本サービスのツール内データは、機能により、利用者のブラウザ内保存、アカウントに紐づく表示設定、または将来提供される同期機能で扱われます。",
          "現時点でサーバー保存の対象となる情報は、アカウント認証、表示言語、テーマなどの軽量な設定を中心とします。画像、素材、予定文、下書き等が自動的にアップロードされるものではありません。",
          "利用者は、重要な出力物や下書きを自身の責任で保存、バックアップするものとします。"
        ]
      },
      {
        heading: "第7条（有料プラン、解約、返金）",
        paragraphs: [
          "Kuro Live Comment Translator Plus（Paidプラン）はUS$6/月（支払総額・USD請求）で、自動更新です。適用される税がある場合はStripe Checkoutで表示されます。カード会社による円換算額や海外利用手数料は変動する場合があります。",
          "販売対象は日本（JP）および米国（US）です。支払方法はクレジットカード、デビットカード、カードを基盤とする対応手段、Stripe Link等のカード系に限り、振込には対応しません。",
          "Paidプランは契約更新周期あたり最大50万入力文字（500,000文字）を利用できます。ただし、これは保証文字数ではありません。個人・全体の安全上限や運用上限により、残り文字数があっても先に停止する場合があります。",
          "解約はCustomer Portalまたは案内されたアカウント画面から行い、次回更新日から有効になります。日割り返金・日割りクレジットは自動提供しません。返金は自動ではなく、二重課金、法令上必要な場合、重大障害等を個別に確認します。",
          "Freeは引き続き利用できます。Checkout、Customer Portal、Webhookその他の決済設定や運用設定は、別途定める承認手順と安全確認の対象です。"
        ]
      },
      {
        heading: "第8条（Kuro Live Comment Translator）",
        paragraphs: [
          "Kuro Live Comment Translator は、初期公開版では YouTube を優先対象とし、利用者が明示的に翻訳セッションを開始した場合に限り、コメント取得、API利用、AI翻訳処理を行います。YouTube アカウントを接続しただけでは、バックグラウンド監視、ポーリング、翻訳、クォータ消費は開始しません。",
          "Free plan は Azure Translator を主な翻訳 provider として利用します。Paid plan は OpenAI mini model を主な翻訳 provider とし、復帰可能な provider error の場合のみ Azure Translator fallback を使います。",
          "DeepL、Gemini Flash/Lite、Cloudflare Workers AI は初期公開時点の production translation provider ではありません。品質・費用・地域・データ利用条件の比較対象として扱い、production routing には含めません。",
          "無料利用枠の初期上限は、1日最大30分、1セッション最大30分、同時に1セッション、30翻訳メッセージ/分、月20,000入力文字です。月間上限は翻訳 provider に送る入力/ソース文字を基準に扱います。",
          "Paidプランでは、コメント本文は翻訳処理のためOpenAIまたはAzureへ送信されます。Providerとモデルの選択はサーバー側のPaid条件で行い、利用者が任意に変更することはできません。",
          "当サービスDBでは、画面表示とセッション復元に必要なsanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をセッション終了後最大24時間保存します。Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製しません。OpenAIは標準のabuse monitoringにより最大30日保持される可能性があり、Azure TranslatorはMicrosoftのNo-Trace方針を前提とします。これは当サービスDBの24時間snapshotとは別のProvider側の処理・保持方針です。",
          "外部プラットフォームやAI翻訳サービスの仕様変更、クォータ、通信状態、配信状態、認証状態、利用上限により、セッションを開始できない、または途中で停止する場合があります。"
        ]
      },
      {
        heading: "第9条（返金、dispute、アカウント削除）",
        paragraphs: [
          "現在の請求期間の全額返金またはdispute利用者勝訴を確認した場合は、対象ownerのPaid利用を即時停止し、対象Subscriptionのidempotentなcancelを要求します。Stripeでcanceledを確認した後にcapacityを解放します。cancelまたは再取得に失敗した場合は、Paid停止とcapacity保持を継続し、manual reconciliationで処理します。",
          "disputeは対象Charge/PaymentIntentから一意に特定できたownerとSubscriptionだけを対象とし、単一のdisputeを理由に全体を停止しません。運営勝訴時は、現在Subscriptionとperiodが有効で、支払い失敗、解約・返金、別dispute、quota/cost/infra停止、reconciliation等の他の停止理由がない場合だけPaidを復元します。",
          "Paid契約中にアカウント削除を申請した場合、原則としてSubscriptionを期間終了時解約へ変更し、支払済み期間の終了後にアプリ側のアカウントと関連データを削除します。Stripe側の法定・会計情報はStripeの保持方針に従います。法的理由等による即時削除は個別に確認します。"
        ]
      },
      {
        heading: "第10条（免責）",
        paragraphs: [
          "当方は、本サービスが利用者の特定の目的、環境、外部プラットフォームの仕様に適合することを保証しません。",
          "通信障害、ブラウザやOSの変更、外部サービスの停止、利用者環境、不可抗力により生じた損害について、当方は責任を負いません。",
          "当方が責任を負う場合でも、当方の故意または重過失がある場合を除き、責任の範囲は利用者が直近1か月に本サービスへ実際に支払った金額を上限とします。"
        ]
      },
      {
        heading: "第11条（規約変更）",
        paragraphs: [
          "当方は、法令変更、サービス内容の変更、セキュリティ上の必要性その他合理的な理由により、本規約を変更することがあります。",
          "重要な変更は、本サービス上での掲示その他適切な方法により告知します。変更後に本サービスを利用した場合、変更後の規約に同意したものとみなされます。"
        ]
      },
      {
        heading: "第12条（準拠法・管轄）",
        paragraphs: [
          "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合、当方所在地を管轄する日本の裁判所を第一審の専属的合意管轄裁判所とします。"
        ]
      }
    ]
  },
  privacy: {
    eyebrow: "Privacy Policy",
    title: "プライバシーポリシー",
    lead: "本ポリシーは、Kuro Stream Kit における情報の取扱いを説明するものです。",
    ...sharedDates,
    sections: [
      {
        heading: "第1条（取得する情報）",
        paragraphs: [
          "本サービスでは、Supabase Auth によるアカウント作成、ログイン、パスワード再設定のため、メールアドレス、認証状態、認証に必要な技術情報を取得します。",
          "また、表示言語、テーマなどの表示設定、問い合わせ時に利用者から提供される情報、Cloudflare による配信や保護のためのアクセスログ、エラー情報を取得する場合があります。"
        ]
      },
      {
        heading: "第2条（利用目的）",
        list: [
          "本サービスの提供、認証、アカウント管理のため",
          "表示設定など、利用者が選択した設定を反映するため",
          "不具合調査、セキュリティ対策、不正利用防止のため",
          "問い合わせへの回答、重要なお知らせの連絡のため",
          "Paidプランの契約、請求、利用状況確認、dispute、返金、アカウント削除に対応するため"
        ]
      },
      {
        heading: "第3条（ツール内データとブラウザ内保存）",
        paragraphs: [
          "現時点のツール内データは、画像、素材、予定文、下書き、編集設定などを含め、原則として利用者のブラウザ内保存を前提としています。",
          "本ポリシーの追加により、既存 storage key、IndexedDB、localStorage key、handoff payload の内容や保存先を変更するものではありません。Billingの権限、地域、契約識別子をブラウザ保存領域へ保存しません。",
          "アカウント機能で扱うサーバー側データは、メールアドレス、認証状態、表示設定、契約・利用状態など、サービス提供に必要な範囲に限定します。Paidの画面表示とセッション復元には、次条のsanitized feed snapshotが例外として保存されます。"
        ]
      },
      {
        heading: "第4条（コメント翻訳機能の情報取扱い）",
        paragraphs: [
          "Kuro Live Comment Translator では、YouTube 連携状態、翻訳セッション状態、利用時間、翻訳メッセージ数、概算のAPI利用量、停止理由など、公開運用に必要なメタデータをサーバー側で扱う場合があります。",
          "OAuth access token、refresh token、認可コード、owner user id、provider channel id、liveChatId、service_role key、Authorization header、provider target metadata は、利用者の画面、ブラウザ保存領域、handoff payload、公開文書、PR本文に表示または保存しません。利用者画面に返す情報は、接続状態、再接続要否、利用状況、停止理由などのサニタイズ済みメタデータに限定します。",
          "YouTube API の呼び出しとAI翻訳処理は、利用者が明示的に翻訳セッションを開始した場合に限って行います。アカウント接続のみでバックグラウンド監視、ポーリング、翻訳、クォータ消費は開始しません。",
          "Free plan は Azure Translator を主な翻訳 provider として利用します。Paid plan は OpenAI mini model を主な翻訳 provider とし、復帰可能な provider error の場合のみ Azure Translator fallback を使います。DeepL、Gemini Flash/Lite、Cloudflare Workers AI は初期公開時点の production translation provider ではありません。",
          "provider policy の説明は処理先とfallback方針の開示に限定し、provider target metadata、liveChatId、owner値、OAuth値、Authorization header、Stripe secret、service-role値は表示しません。利用者画面へ返す情報は、接続状態、再接続要否、利用状況、停止理由などのサニタイズ済みメタデータに限定します。",
          "当サービスDBでは、画面表示とセッション復元に必要なsanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をセッション終了後最大24時間保存します。これはコメント本文を保存しないという意味ではありません。Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製せず、文字数、Provider、モデル、token数、処理時間、成功・失敗分類などの最小限の集計だけを保持します。"
        ]
      },
      {
        heading: "第5条（AIモデルの学習利用）",
        paragraphs: [
          "利用者が本サービス上で使用、アップロード、編集した画像、素材、予定文、下書きその他のツール内データを、当方がAIモデルの学習目的で使用しないものとします。",
          "コメント翻訳など、利用者が明示的にAI機能を利用した場合、機能提供に必要な範囲で入力内容や対象データが外部サービスへ送信される場合があります。その場合も、送信は対象機能の実行中に必要な範囲へ限定し、標準ではAIモデル学習目的に利用しません。",
          "OpenAI API/business data は標準ではモデル学習に使用されない方針に基づいて扱いますが、標準のabuse monitoringにより最大30日保持される可能性があります。Azure TranslatorはMicrosoftのNo-Trace方針を前提に扱います。Providerの規約、地域、価格、学習・保持条件は公開前またはlive/provider実行前に再確認し、専門家確認が完了するまで確定事項として扱いません。"
        ]
      },
      {
        heading: "第6条（外部サービス）",
        paragraphs: [
          "本サービスは、認証基盤として Supabase Auth、ホスティング、配信、セキュリティ保護として Cloudflare を利用します。",
          "Kuro Live Comment Translator の公開運用では、利用者が明示的に開始した翻訳セッションの提供に必要な範囲で、YouTube API、Azure Translator、OpenAI mini model を利用する場合があります。Paid plan の復帰可能な provider error では Azure Translator fallback を使うことがあります。",
          "DeepL、Gemini Flash/Lite、Cloudflare Workers AI は、初期公開時点では比較・検証対象に限定し、production provider として過剰に表示しません。",
          "Paidプランの決済処理にはStripeを利用します。カード情報や完全な請求先住所は当方のアプリケーションで直接保持せず、決済事業者が取り扱います。",
          "将来、利用状況の把握や改善のために GA4、Cookie、類似技術、外部送信を利用する場合があります。その場合は、送信先、目的、送信される情報を本ポリシーまたは機能画面で明示します。"
        ]
      },
      {
        heading: "第7条（第三者提供）",
        paragraphs: [
          "当方は、法令に基づく場合、利用者の同意がある場合、サービス提供に必要な委託先に必要最小限の情報を取り扱わせる場合を除き、個人情報を第三者に提供しません。"
        ]
      },
      {
        heading: "第8条（安全管理）",
        paragraphs: [
          "当方は、アクセス制限、通信の暗号化、権限分離、公開してはならない secret / service_role key の非公開管理など、合理的な安全管理措置を講じます。",
          "ただし、利用者の端末、ブラウザ、外部プラットフォーム、ネットワーク環境に起因する問題について、当方が完全な安全性を保証するものではありません。"
        ]
      },
      {
        heading: "第9条（開示・訂正・削除）",
        paragraphs: [
          "利用者本人から、当方が保有する個人情報の開示、訂正、削除、利用停止等の請求があった場合、本人確認のうえ、法令に従い合理的な範囲で対応します。",
          "Comment Translator のYouTube連携は、Kuro Stream Kit側のアカウント連携ページで切断できます。この切断はserver-only credential referenceを無効化しますが、Google側で許可したアクセス権は取り消しません。Google側のアクセス権は、Googleアカウントの「サードパーティとの接続」で Kuro Live Comment Translator を選び、アクセス権を削除してください。",
          "Paid契約中のアカウント削除では、原則としてSubscriptionを期間終了時解約へ変更し、支払済み期間終了後にアプリ側のアカウントと関連データを削除します。Stripe側の法定・会計情報はStripeの保持方針に従います。disputeや返金の確認に必要な契約、同意version、利用集計、ログイン・Provider集計は、必要最小限の期間だけ保持します。",
          "disputeは対象ownerとSubscriptionを一意に特定できた場合だけその範囲で処理し、利用者勝訴時はPaid即時停止、idempotentなcancel、canceled確認後のcapacity解放を行います。失敗時は停止・保持・manual reconciliationとし、運営勝訴時は現在Subscription/periodが有効で他の停止理由がない場合だけ復元します。問い合わせは feedback@kuro-lab.com または本サービス内のフィードバック導線からご連絡ください。"
        ]
      },
      {
        heading: "第10条（変更）",
        paragraphs: [
          "当方は、法令変更、利用サービスの追加、機能変更に応じて本ポリシーを変更することがあります。重要な変更は、本サービス上での掲示その他適切な方法により告知します。"
        ]
      }
    ]
  },
  tokushoho: {
    eyebrow: "Specified Commercial Transactions Act",
    title: "特定商取引法に基づく表記",
    lead: "Kuro Live Comment Translator Plus（Paid Core v1）の販売条件を表示します。",
    ...sharedDates,
    sections: [
      {
        heading: "事業者情報",
        rows: [
          { label: "販売業者", value: "KuroDev" },
          { label: "運営責任者", value: "請求があった場合には遅滞なく開示いたします。" },
          { label: "所在地", value: "請求があった場合には遅滞なく開示いたします。" },
          { label: "電話番号", value: "請求があった場合には遅滞なく開示いたします。" },
          { label: "メールアドレス", value: "feedback@kuro-lab.com" }
        ]
      },
      {
        heading: "販売条件",
        rows: [
          { label: "販売価格", value: "Kuro Live Comment Translator PlusはUS$6/月（支払総額・USD請求）です。適用される税がある場合はStripe Checkoutで表示されます。自動更新で、カード会社による円換算額や海外利用手数料は変動する場合があります。" },
          { label: "商品代金以外の必要料金", value: "インターネット接続料金、通信料金、決済時に利用者側で発生する手数料等は利用者の負担となります。" },
          { label: "販売地域", value: "初期販売対象は日本（JP）および米国（US）です。現在の接続地域が対象外または確認不能の場合は購入できません。居住国をIP判定だけで断定しません。" },
          { label: "支払方法", value: "クレジットカード、デビットカード、カードを基盤とする対応手段、Stripe Link等のカード系に限ります。振込には対応しません。決済処理にはStripeを利用します。" },
          { label: "支払時期", value: "申込時および各契約更新時に支払いが発生します。自動更新の停止は次回更新日前にCustomer Portalまたは案内されたアカウント画面で行ってください。" },
          { label: "提供時期", value: "決済と署名済みWebhookによるサーバー側の契約反映を確認した後、対象機能を利用できる状態にします。Checkout完了画面だけではPaidを有効にしません。" },
          { label: "利用上限・送信", value: "契約更新周期あたり最大50万入力文字（500,000文字）ですが、保証文字数ではありません。個人・全体の安全上限や運用上限により先に停止する場合があります。コメント本文は翻訳処理のためOpenAIまたはAzureへ送信されます。" },
          { label: "解約", value: "Customer Portalまたは案内されたアカウント画面から解約できます。解約は次回更新日から有効で、支払済み期間の終了までは利用できます。" },
          { label: "返金・dispute", value: "返金は自動ではありません。二重課金、法令上必要な場合、重大障害等を個別に確認します。dispute利用者勝訴時は対象ownerのPaidを即時停止し、idempotentなcancelとcanceled確認後のcapacity解放を行います。失敗時は停止・保持・manual reconciliationとします。dispute運営勝訴時は現在Subscription/periodが有効で、他の停止理由がない場合だけPaidを復元し、それ以外は停止・保持・manual reconciliationとします。" },
          { label: "アカウント削除", value: "Paid契約中の削除申請は原則として期間終了時解約へ変更し、支払済み期間終了後にアプリ側のアカウントと関連データを削除します。Stripe側の法定・会計情報はStripeの保持方針に従います。" },
          { label: "データ・Provider", value: "当サービスDBではsanitized feed snapshotをセッション終了後最大24時間保存します。Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製しません。OpenAIは最大30日保持される可能性があり、Azure TranslatorはMicrosoftのNo-Trace方針を前提とします。" },
          { label: "動作環境", value: "最新の主要ブラウザを搭載したPC、タブレット、スマートフォンを推奨します。利用するツールにより画面幅、画像処理性能、ブラウザ保存領域が必要になる場合があります。" }
        ]
      },
      {
        heading: "現在の提供状況",
        paragraphs: [
          "本表はPaid Core v1の価格、販売地域、支払方法、更新周期、解約、返金、データ送信、保持境界を示します。税務、特商法、プライバシーに関する最終的な専門家確認が完了するまでは、未確認事項を確定的な法的判断として扱いません。",
          "Freeは引き続き利用できます。実際の公開・設定・提供可否、StripeやProviderのlive操作、デプロイ、activationは別の承認ゲートに従います。"
        ]
      }
    ]
  }
} as const satisfies Record<"terms" | "privacy" | "tokushoho", LegalDocument>;

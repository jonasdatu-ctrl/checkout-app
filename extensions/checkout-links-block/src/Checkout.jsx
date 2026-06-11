import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useSettings } from "@shopify/ui-extensions/checkout/preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const settings = useSettings() || {};
  const messageTemplate =
    settings.message_template ||
    "By placing your order, you agree to our {terms} and {privacy}.";
  const linkColorConfig = normalizeLinkColor(settings.link_color);
  const messageAlignment = normalizeAlignment(settings.message_alignment);
  const messageSize = normalizeFontSize(settings.message_size);

  const links = buildLinksFromSettings(settings, linkColorConfig);
  const linksByToken = Object.fromEntries(
    links.map((link) => [link.token, link]),
  );

  const alignItems = alignmentToStackAlign(messageAlignment);

  return (
    <s-stack gap="base" alignItems={alignItems}>
      {renderMessage(messageTemplate, linksByToken, messageSize)}
      {links.length === 0 ? (
        <s-text color="subdued">
          Add link settings in the checkout editor to show clickable policy
          links.
        </s-text>
      ) : null}
      {links.map((link) => (
        <s-modal id={link.modalId} heading={link.modalTitle} key={link.modalId}>
          {renderModalBody(link.modalBody)}
          <s-button
            slot="primary-action"
            command="--hide"
            commandFor={link.modalId}
          >
            Close
          </s-button>
        </s-modal>
      ))}
    </s-stack>
  );
}

function buildLinksFromSettings(settings, linkColorConfig) {
  return [1, 2]
    .map((index) => {
      const token = (settings[`link_${index}_token`] || "").trim();
      const label = (settings[`link_${index}_label`] || "").trim();
      if (!token || !label) return null;
      return {
        token,
        label,
        linkTone: linkColorConfig.linkTone,
        linkTextTone: linkColorConfig.textTone,
        modalTitle:
          (settings[`link_${index}_modal_title`] || "").trim() ||
          label ||
          "Details",
        modalBody:
          (settings[`link_${index}_modal_body`] || "").trim() ||
          "Add content for this link in the checkout editor.",
        modalId: `link-modal-${index}`,
      };
    })
    .filter(Boolean);
}

function renderMessageTemplate(template, linksByToken) {
  const parts = [];
  const tokenRegex = /\{([a-zA-Z0-9_-]+)\}/g;
  let cursor = 0;
  let match;

  while ((match = tokenRegex.exec(template)) !== null) {
    const [fullToken, tokenName] = match;
    const link = linksByToken[tokenName];

    if (match.index > cursor) {
      parts.push(template.slice(cursor, match.index));
    }

    if (link) {
      parts.push(
        <s-link command="--show" commandFor={link.modalId} tone={link.linkTone}>
          <s-text tone={link.linkTextTone}>{link.label}</s-text>
        </s-link>,
      );
    } else {
      parts.push(fullToken);
    }

    cursor = tokenRegex.lastIndex;
  }

  if (cursor < template.length) {
    parts.push(template.slice(cursor));
  }

  return parts;
}

function renderModalBody(body) {
  return body.split("\n").map((line, i) => {
    const { text, small, textType, textAlign } = parseLineStyle(line);
    const content = text || "\u00A0";
    const inner = textType ? (
      <s-text type={textType}>{content}</s-text>
    ) : (
      content
    );
    const props = {};
    if (small) props.type = "small";
    if (textAlign) props.textAlign = textAlign;
    return (
      <s-paragraph key={i} {...props}>
        {inner}
      </s-paragraph>
    );
  });
}

function parseLineStyle(line) {
  const match = line.match(/^\[([^\]]+)\](.*)/);
  if (!match)
    return { text: line, small: false, textType: null, textAlign: null };

  const directives = match[1].split(",").map((d) => d.trim().toLowerCase());
  const text = match[2];

  let small = false;
  let textType = null;
  let textAlign = null;

  for (const directive of directives) {
    if (directive === "small") small = true;
    else if (directive === "bold") textType = "strong";
    else if (directive === "italic") textType = "offset";
    else if (directive === "left") textAlign = "start";
    else if (directive === "center") textAlign = "center";
    else if (directive === "right") textAlign = "end";
  }

  return { text, small, textType, textAlign };
}

function normalizeAlignment(value) {
  const normalized = String(value || "left")
    .trim()
    .toLowerCase();
  return ["left", "center", "right"].includes(normalized) ? normalized : "left";
}

function normalizeFontSize(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "small") return "small";
  if (normalized === "large") return "large";
  if (normalized === "medium" || normalized === "base" || !normalized) {
    return "base";
  }

  return "base";
}

function normalizeLinkColor(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  // Link component supports only auto|neutral for tone.
  const linkTone = normalized === "neutral" ? "neutral" : "auto";

  // Use text tone inside the link for visible color choices.
  const allowedTextTones = [
    "auto",
    "neutral",
    "info",
    "success",
    "warning",
    "critical",
  ];
  const textTone = allowedTextTones.includes(normalized) ? normalized : "auto";

  return { linkTone, textTone };
}

function alignmentToStackAlign(alignment) {
  if (alignment === "center") return "center";
  if (alignment === "right") return "end";
  return "start";
}

function renderMessage(template, linksByToken, sizeValue) {
  const content = renderMessageTemplate(template, linksByToken);

  if (sizeValue === "small") {
    return <s-text type="small">{content}</s-text>;
  }

  // Checkout text components don't expose a larger non-heading size.
  // Keep "large" aligned to base to avoid changing font weight unexpectedly.
  return <s-text>{content}</s-text>;
}

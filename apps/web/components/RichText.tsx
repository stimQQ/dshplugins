/**
 * Renders `backtick` spans as real code elements.
 *
 * The homepage copy lives in a plain-string data module so both languages stay
 * paired and diffable; backticks are how that module marks code without embedding
 * markup in translatable strings.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded-md px-1.5 py-0.5 font-mono text-sm"
            style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}
          >
            {part}
          </code>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}

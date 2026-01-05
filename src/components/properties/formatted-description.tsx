'use client';

interface FormattedDescriptionProps {
  readonly description: string;
}

/**
 * Component to display a formatted property description
 * Preserves line breaks, detects lists, and formats special characters
 */
export function FormattedDescription({ description }: FormattedDescriptionProps): JSX.Element {
  // Split description into lines
  const lines = description.split('\n').filter((line) => line.trim().length > 0);

  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        // Detect list items (starts with -, •, *, ➡️, ✔, or number.)
        const isListItem =
          /^[-•*➡️✔]\s/.test(trimmedLine) ||
          /^\d+\.\s/.test(trimmedLine) ||
          /^[➡️✔]\s/.test(trimmedLine);

        // Detect section headers (lines that end with : and are short)
        const isSectionHeader =
          trimmedLine.endsWith(':') && trimmedLine.length < 100;

        if (isSectionHeader) {
          return (
            <h3
              key={index}
              className="font-semibold text-gray-900 mt-4 mb-2 text-base"
            >
              {trimmedLine}
            </h3>
          );
        }

        if (isListItem) {
          return (
            <div key={index} className="flex gap-2 mb-1 ml-4">
              <span className="text-primary-600 font-semibold flex-shrink-0">
                {trimmedLine.match(/^[➡️✔•*-]|\d+\./)?.[0] || '•'}
              </span>
              <span className="text-gray-700">
                {trimmedLine.replace(/^[➡️✔•*-]\s|\d+\.\s/, '')}
              </span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={index} className="text-gray-700 mb-3 leading-relaxed">
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );
}

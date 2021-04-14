import uuid from 'uuid/v4';

export const normalizeRedactionResponse = (redactions) => {
  const normalizedRedactions = {};

  redactions.forEach((redaction) => {
    if (!normalizedRedactions[redaction.page]) normalizedRedactions[redaction.page] = {};

    normalizedRedactions[redaction.page][uuid()] = {
      Top: redaction.top,
      Left: redaction.left,
      Width: redaction.width,
      Height: redaction.height,
    };
  });

  return normalizedRedactions;
};

export const getRedactionsDto = (redactions) =>
  Object.entries(redactions).flatMap(([page, redactionsOnPage]) =>
    Object.values(redactionsOnPage).map(({ Top: top, Left: left, Width: width, Height: height }) => ({
      page,
      top,
      left,
      width,
      height,
    })),
  );

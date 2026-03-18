import xss from 'xss';

export const sanitize = (content) => {
  if (!content) return content;
  if (typeof content !== 'string') return content;
  return xss(content);
};

export const sanitizeObject = (obj) => {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  return sanitized;
};

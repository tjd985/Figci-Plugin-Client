const isValidFigmaUrl = figmaUrl => {
  const figmaUrlPattern =
    /^(?:https:\/\/)?(?:www\.)?figma\.com\/(?:file|design)\/([0-9a-zA-Z]{22,128})(?:\/([^?]+)?(\?.*)?)?$/;

  return figmaUrlPattern.test(figmaUrl);
};

export default isValidFigmaUrl;

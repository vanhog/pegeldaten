function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function mapObject(source, mapper) {
  const target = {};

  Object.entries(mapper).forEach(([targetKey, sourcePath]) => {
    target[targetKey] = getNestedValue(source, sourcePath);
  });

  return target;
}

export { getNestedValue, mapObject };

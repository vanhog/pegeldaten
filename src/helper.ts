function getNestedValue(obj: Object, path: String) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function mapObject(source: Object, mapper: Object) {
  const target = {};

  Object.entries(mapper).forEach(([targetKey, sourcePath]) => {
    target[targetKey] = getNestedValue(source, sourcePath);
  });

  return target;
}

export { getNestedValue, mapObject };

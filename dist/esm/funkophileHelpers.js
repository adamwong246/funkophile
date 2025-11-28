// funkophileHelpers.ts
import { createSelector } from "reselect";
import path from "path";
var contentsOfFiles = (selector) => {
  return createSelector([selector], (selected) => {
    if (selected === void 0 || selected === null) {
      throw new Error(`contentsOfFiles: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\x1B[33m\x1B[1m[Funkophile]\x1B[0m contentsOfFiles: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return "";
    }
    return Object.keys(selected).reduce((mm, k) => mm + (selected[k] || ""), "");
  });
};
var contentOfFile = (selector) => {
  return createSelector([selector], (selected) => {
    if (selected === void 0 || selected === null) {
      throw new Error(`contentOfFile: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\x1B[33m\x1B[1m[Funkophile]\x1B[0m contentOfFile: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return "";
    }
    return selected[keys[0]] || "";
  });
};
var srcAndContentOfFile = (selector, key) => {
  return createSelector([selector], (selected) => {
    if (selected === void 0 || selected === null) {
      throw new Error(`srcAndContentOfFile: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\x1B[33m\x1B[1m[Funkophile]\x1B[0m srcAndContentOfFile: selected object is empty for key "${key}". No files found. This may be because the input pattern didn't match any files.`);
      return {
        src: key,
        content: ""
      };
    }
    let matchingKey = keys.find((k) => k === key);
    if (!matchingKey) {
      const resolvedKey = path.resolve(process.cwd(), key);
      matchingKey = keys.find((k) => k === resolvedKey);
    }
    if (!matchingKey) {
      const keyBasename = path.basename(key);
      matchingKey = keys.find((k) => path.basename(k) === keyBasename);
    }
    if (!matchingKey) {
      const relativeKey = path.relative(process.cwd(), key);
      matchingKey = keys.find((k) => {
        const kRelative = path.relative(process.cwd(), k);
        return kRelative === relativeKey;
      });
    }
    if (!matchingKey) {
      matchingKey = keys.find((k) => k.endsWith(key));
    }
    if (!matchingKey) {
      matchingKey = keys.find((k) => k.endsWith(key.replace("./", "")));
    }
    if (!matchingKey) {
      const cleanKey = key.startsWith("./") ? key.slice(2) : key;
      matchingKey = keys.find((k) => k.endsWith(cleanKey));
    }
    if (!matchingKey) {
      console.warn(`\x1B[33m\x1B[1m[Funkophile]\x1B[0m srcAndContentOfFile: key "${key}" not found in selected object. Available keys: ${keys.join(", ")}`);
      return {
        src: key,
        content: ""
      };
    }
    return {
      src: matchingKey,
      content: selected[matchingKey]
    };
  });
};
var srcAndContentOfFiles = (selector) => {
  return createSelector([selector], (selected) => {
    if (selected === void 0 || selected === null) {
      throw new Error(`srcAndContentOfFiles: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\x1B[33m\x1B[1m[Funkophile]\x1B[0m srcAndContentOfFiles: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return [];
    }
    return keys.map((key) => {
      return {
        src: key,
        content: selected[key]
      };
    });
  });
};
export {
  contentOfFile,
  contentsOfFiles,
  srcAndContentOfFile,
  srcAndContentOfFiles
};
//# sourceMappingURL=funkophileHelpers.js.map

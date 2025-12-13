import { createSelector } from "reselect";
import path from "path";

export const contentsOfFiles = (selector: (state: any) => Record<string, string | Buffer>): any => {
  return createSelector([selector], (selected) => {
    if (selected === undefined || selected === null) {
      throw new Error(`contentsOfFiles: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\u001b[33m\u001b[1m[Funkophile]\u001b[0m contentsOfFiles: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return "";
    }
    return Object.keys(selected).reduce((mm, k) => mm + (selected[k] || ""), "");
  });
};

export const contentOfFile = (selector: (state: any) => Record<string, string | Buffer>): any => {
  return createSelector([selector], (selected) => {
    if (selected === undefined || selected === null) {
      throw new Error(`contentOfFile: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\u001b[33m\u001b[1m[Funkophile]\u001b[0m contentOfFile: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return "";
    }
    return selected[keys[0]] || "";
  });
};

export const srcAndContentOfFile = (selector: (state: any) => Record<string, string | Buffer>, key: string): any => {
  return createSelector([selector], (selected) => {
    if (selected === undefined || selected === null) {
      throw new Error(`srcAndContentOfFile: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      // Return a default object with empty content instead of throwing
      console.warn(`\u001b[33m\u001b[1m[Funkophile]\u001b[0m srcAndContentOfFile: selected object is empty for key "${key}". No files found. This may be because the input pattern didn't match any files.`);
      return {
        src: key,
        content: '',
      };
    }
    
    // Try exact match first
    let matchingKey = keys.find(k => k === key);
    
    // If exact match not found, try to find by resolving to absolute path
    if (!matchingKey) {
      // Try to resolve the key to an absolute path
      const resolvedKey = path.resolve(process.cwd(), key);
      matchingKey = keys.find(k => k === resolvedKey);
    }
    
    // If still not found, try to find by basename
    if (!matchingKey) {
      const keyBasename = path.basename(key);
      matchingKey = keys.find(k => path.basename(k) === keyBasename);
    }
    
    // If still not found, try to find by relative path
    if (!matchingKey) {
      const relativeKey = path.relative(process.cwd(), key);
      matchingKey = keys.find(k => {
        const kRelative = path.relative(process.cwd(), k);
        return kRelative === relativeKey;
      });
    }
    
    // If still not found, try to find by ending with the key
    if (!matchingKey) {
      matchingKey = keys.find(k => k.endsWith(key));
    }
    
    // If still not found, try to find by the key ending with the path
    if (!matchingKey) {
      matchingKey = keys.find(k => k.endsWith(key.replace('./', '')));
    }
    
    // If still not found, try to find by the key being a relative path that matches
    if (!matchingKey) {
      // Remove leading './' if present
      const cleanKey = key.startsWith('./') ? key.slice(2) : key;
      matchingKey = keys.find(k => k.endsWith(cleanKey));
    }
    
    if (!matchingKey) {
      console.warn(`\u001b[33m\u001b[1m[Funkophile]\u001b[0m srcAndContentOfFile: key "${key}" not found in selected object. Available keys: ${keys.join(', ')}`);
      return {
        src: key,
        content: '',
      };
    }
    
    return {
      src: matchingKey,
      content: selected[matchingKey],
    };
  });
};

export const srcAndContentOfFiles = (selector: (state: any) => Record<string, string | Buffer>): any => {
  return createSelector([selector], (selected) => {
    if (selected === undefined || selected === null) {
      throw new Error(`srcAndContentOfFiles: selected is ${selected}. Make sure the selector is pointing to valid state.`);
    }
    const keys = Object.keys(selected);
    if (keys.length === 0) {
      console.warn(`\u001b[33m\u001b[1m[Funkophile]\u001b[0m srcAndContentOfFiles: selected object is empty. No files found. This may be because the input pattern didn't match any files.`);
      return [];
    }
    return keys.map((key) => {
      return {
        src: key,
        content: selected[key],
      };
    });
  });
};

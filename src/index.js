const findTemplateValueVisitor = {
  VariableDeclarator(path) {
    if (Object.keys(this).includes(path.node.id.name)
      && this[path.node.id.name] === null) {
      if (typeof path.node.init.value !== "string") {
        throw path.buildCodeFrameError(`Value corresponding to the template id: \`${path.node.id.name}\` must be a string.`);
      }
      this[path.node.id.name] = path.node.init.value;
    }
  },

  // Use Cases:
  // Variable passed into function
  // Variable assignment passed into function
  // Literal passed into function
  // Default parameter for function
}

export default function ({ types: t }) {
  return {
    visitor: {
      Identifier(path, state){
        const tag = state.opts.tag || 'ಠ_ಠ';

        if (path.node.name.includes(tag)) {
          const nameMap = findAllTemplateNames(path.node.name, path, tag);
          path.node.name = path.node.name
            .split(tag)
            .map(part => nameMap[part] || part)
            .join('')
        }
      }
    }
  };
}

function findAllTemplateNames(name, path, tag) {
  let lowestNecessaryPath;
  
  // Ensure that tags are the first and last thing in the string
  const cleanTagSplit = name
    .slice(name.indexOf(tag), name.lastIndexOf(tag) + tag.length)
    .split(tag)

  // Check if all tags are closed
  if (cleanTagSplit.length % 2 === 0) {
    throw path.buildCodeFrameError(`Expected an even number of tags.`);
  }

  // Filter out the parts of the string that are not references to a variable
  const templateVarNames = cleanTagSplit.filter((a, i) => i % 2);

  // Set up an object with keys for each variable that needs to be retrieved.
  // Their respective values will be populated during traversal.
  const resultStore = templateVarNames
    .reduce((acc, cur) => {
      acc[cur] = null;
      return acc;
    }, {});

  templateVarNames.forEach((templateVarName) => {
    // TODO: If I can determine which path is most distant, I could just traverse that one.
    // Traverse up the tree to the point where the variable is available in scope
    lowestNecessaryPath = path.find((path) => path.scope.bindings[templateVarName]);

    // Throw if not found.
    if (lowestNecessaryPath === null) {
      throw path.buildCodeFrameError(`Could not find a value corresponding to the template id: \`${templateVarName}\``);
    }

    // Use another Visitor to handle the retrieval of each value.
    lowestNecessaryPath.traverse(findTemplateValueVisitor, resultStore);
  })

  return resultStore;
}

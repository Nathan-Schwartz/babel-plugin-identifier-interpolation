const shallowVariableDeclaratorVisitor = {
  BlockStatement(path) {
    // Any block statements found here will already have been checked or won't be ancestors
    path.skip();
  },
  VariableDeclarator(path) {
    // If this node's name matches the name of an unfulfilled variable, attempt to use it's value
    if (Object.keys(this).includes(path.node.id.name) && this[path.node.id.name] === null) {
      if (typeof path.node.init.value !== "string") {
        throw path.buildCodeFrameError(`Value corresponding to the template id: \`${path.node.id.name}\` must be a string.`);
      }
      this[path.node.id.name] = path.node.init.value;
    }
  }
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

  let workingPath = path;
  let lastWorkingPath;
  do {
    // Store reference in case we need to do a follow up search.
    lastWorkingPath = workingPath;

    // Overwrite working path with the path of the nearest ancestor of type "BlockStatement"
    // After retrieval, we will search this node for the value of the variable specified
    workingPath = workingPath.findParent((path) => path.node.type === "BlockStatement")

    // If there are no more ancestral BlockStatements, it is time to check the Program level.
    // This will be the final traversal.
    if (workingPath === null) {
      lastWorkingPath
        .findParent((path) => path.node.type === "Program")
        .traverse(shallowVariableDeclaratorVisitor, resultStore)

      // Check for any unfulfilled entries in resultStore. If there are any, raise.
      const unfulfilled = Object.keys(resultStore).find(key => resultStore[key] === null)
      if (unfulfilled) {
        throw path.buildCodeFrameError(`Could not find a value corresponding to the template id: \`${unfulfilled}\``);
      }

      // If all are fulfilled, exit the loop and return resultStore.
      return resultStore;
    }

    workingPath.traverse(shallowVariableDeclaratorVisitor, resultStore)

  } while (Object.keys(resultStore).some(key => resultStore[key] === null));

  return resultStore;
}

import { JsonObject, JsonValue } from './types'

export interface TransformResult {
  value: JsonValue
  replacementCount: number
}

const searchValue = 'dog'
const replacementValue = 'cat'

type StackEntry =
  { parent: JsonValue[]; index: number } | { parent: JsonObject; key: string }

function isContainer(value: JsonValue): value is JsonObject | JsonValue[] {
  return typeof value === 'object' && value !== null
}

function pushChildrenInReverse(
  stack: StackEntry[],
  container: JsonObject | JsonValue[],
): void {
  if (Array.isArray(container)) {
    for (let index = container.length - 1; index >= 0; index -= 1) {
      stack.push({ parent: container, index })
    }
    return
  }
  const keys = Object.keys(container)
  for (let position = keys.length - 1; position >= 0; position -= 1) {
    const key = keys[position]
    if (key !== undefined) {
      stack.push({ parent: container, key })
    }
  }
}

function readChild(entry: StackEntry): JsonValue | undefined {
  return 'index' in entry ? entry.parent[entry.index] : entry.parent[entry.key]
}

function writeChild(entry: StackEntry, value: JsonValue): void {
  if ('index' in entry) {
    entry.parent[entry.index] = value
  } else {
    entry.parent[entry.key] = value
  }
}

export function transformJson(
  root: JsonValue,
  maxReplacements: number,
): TransformResult {
  if (maxReplacements === 0) {
    return { value: root, replacementCount: 0 }
  }
  if (root === searchValue) {
    return { value: replacementValue, replacementCount: 1 }
  }
  if (!isContainer(root)) {
    return { value: root, replacementCount: 0 }
  }

  let replacementCount = 0
  const stack: StackEntry[] = []
  pushChildrenInReverse(stack, root)

  while (replacementCount < maxReplacements) {
    const entry = stack.pop()
    if (entry === undefined) {
      break
    }
    const child = readChild(entry)
    if (child === searchValue) {
      writeChild(entry, replacementValue)
      replacementCount += 1
    } else if (child !== undefined && isContainer(child)) {
      pushChildrenInReverse(stack, child)
    }
  }

  return { value: root, replacementCount }
}

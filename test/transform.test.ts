import { describe, expect, it } from 'vitest'
import { transformJson } from '../src/transform'
import { JsonValue } from '../src/types'

const unlimited = Number.MAX_SAFE_INTEGER

function buildDeeplyNestedValue(depth: number): {
  root: JsonValue
  leafHolder: JsonValue[]
} {
  const leafHolder: JsonValue[] = ['dog']
  let root: JsonValue = leafHolder
  for (let level = 0; level < depth; level += 1) {
    root = { nested: [root] }
  }
  return { root, leafHolder }
}

describe('transformJson', () => {
  it('replaces a root "dog" string', () => {
    expect(transformJson('dog', unlimited)).toEqual({
      value: 'cat',
      replacementCount: 1,
    })
  })

  it('leaves a root non-matching string unchanged', () => {
    expect(transformJson('bird', unlimited)).toEqual({
      value: 'bird',
      replacementCount: 0,
    })
  })

  it('leaves a root number unchanged', () => {
    expect(transformJson(42, unlimited)).toEqual({
      value: 42,
      replacementCount: 0,
    })
  })

  it('leaves a root boolean unchanged', () => {
    expect(transformJson(true, unlimited)).toEqual({
      value: true,
      replacementCount: 0,
    })
  })

  it('leaves root null unchanged', () => {
    expect(transformJson(null, unlimited)).toEqual({
      value: null,
      replacementCount: 0,
    })
  })

  it('replaces matching values in a simple object', () => {
    const result = transformJson({ pet: 'dog', name: 'Rex' }, unlimited)

    expect(result.value).toEqual({ pet: 'cat', name: 'Rex' })
    expect(result.replacementCount).toBe(1)
  })

  it('never transforms an object key named "dog"', () => {
    const result = transformJson({ dog: 'dog' }, unlimited)

    expect(result.value).toEqual({ dog: 'cat' })
    expect(result.replacementCount).toBe(1)
  })

  it('replaces matching values in nested objects', () => {
    const result = transformJson(
      { outer: { inner: { pet: 'dog' } } },
      unlimited,
    )

    expect(result.value).toEqual({ outer: { inner: { pet: 'cat' } } })
    expect(result.replacementCount).toBe(1)
  })

  it('replaces matching values in arrays', () => {
    const result = transformJson(['dog', 'bird', 'dog'], unlimited)

    expect(result.value).toEqual(['cat', 'bird', 'cat'])
    expect(result.replacementCount).toBe(2)
  })

  it('replaces matching values in mixed nested structures', () => {
    const result = transformJson(
      {
        pets: ['dog', { kind: 'dog', toys: [null, 'dog', 7] }],
        count: 3,
        active: true,
      },
      unlimited,
    )

    expect(result.value).toEqual({
      pets: ['cat', { kind: 'cat', toys: [null, 'cat', 7] }],
      count: 3,
      active: true,
    })
    expect(result.replacementCount).toBe(3)
  })

  it('leaves an empty object unchanged', () => {
    expect(transformJson({}, unlimited)).toEqual({
      value: {},
      replacementCount: 0,
    })
  })

  it('leaves an empty array unchanged', () => {
    expect(transformJson([], unlimited)).toEqual({
      value: [],
      replacementCount: 0,
    })
  })

  it('leaves "Dog" unchanged', () => {
    expect(transformJson('Dog', unlimited)).toEqual({
      value: 'Dog',
      replacementCount: 0,
    })
  })

  it('leaves "DOG" unchanged', () => {
    expect(transformJson('DOG', unlimited)).toEqual({
      value: 'DOG',
      replacementCount: 0,
    })
  })

  it('leaves "dogs" unchanged', () => {
    expect(transformJson('dogs', unlimited)).toEqual({
      value: 'dogs',
      replacementCount: 0,
    })
  })

  it('leaves "hotdog" unchanged', () => {
    expect(transformJson('hotdog', unlimited)).toEqual({
      value: 'hotdog',
      replacementCount: 0,
    })
  })

  it('leaves "dog house" unchanged', () => {
    expect(transformJson('dog house', unlimited)).toEqual({
      value: 'dog house',
      replacementCount: 0,
    })
  })

  it('performs no replacements when the maximum is zero', () => {
    const result = transformJson(['dog', { pet: 'dog' }], 0)

    expect(result.value).toEqual(['dog', { pet: 'dog' }])
    expect(result.replacementCount).toBe(0)
  })

  it('performs no replacement on a root "dog" when the maximum is zero', () => {
    expect(transformJson('dog', 0)).toEqual({
      value: 'dog',
      replacementCount: 0,
    })
  })

  it('replaces only the first match when the maximum is one', () => {
    const result = transformJson(['dog', 'dog', 'dog'], 1)

    expect(result.value).toEqual(['cat', 'dog', 'dog'])
    expect(result.replacementCount).toBe(1)
  })

  it('stops when the maximum is below the match count', () => {
    const result = transformJson(['dog', 'dog', 'dog', 'dog'], 2)

    expect(result.value).toEqual(['cat', 'cat', 'dog', 'dog'])
    expect(result.replacementCount).toBe(2)
  })

  it('replaces everything when the maximum equals the match count', () => {
    const result = transformJson(['dog', 'dog', 'dog'], 3)

    expect(result.value).toEqual(['cat', 'cat', 'cat'])
    expect(result.replacementCount).toBe(3)
  })

  it('replaces everything when the maximum exceeds the match count', () => {
    const result = transformJson(['dog', 'dog'], 10)

    expect(result.value).toEqual(['cat', 'cat'])
    expect(result.replacementCount).toBe(2)
  })

  it('replaces in deterministic left-to-right depth-first order', () => {
    const result = transformJson(
      {
        first: { inner: ['dog', 'dog'] },
        second: 'dog',
        third: ['dog', { fourth: 'dog' }],
      },
      3,
    )

    expect(result.value).toEqual({
      first: { inner: ['cat', 'cat'] },
      second: 'cat',
      third: ['dog', { fourth: 'dog' }],
    })
    expect(result.replacementCount).toBe(3)
  })

  it('visits depth-first before later siblings', () => {
    const result = transformJson(['dog', ['dog', ['dog']], 'dog'], 3)

    expect(result.value).toEqual(['cat', ['cat', ['cat']], 'dog'])
    expect(result.replacementCount).toBe(3)
  })

  it('handles deeply nested input beyond recursive call-stack limits', () => {
    const depth = 200000
    const { root, leafHolder } = buildDeeplyNestedValue(depth)

    const result = transformJson(root, unlimited)

    expect(result.replacementCount).toBe(1)
    expect(leafHolder[0]).toBe('cat')
  })

  it('reports the total replacement count', () => {
    const result = transformJson(
      { a: 'dog', b: ['dog', 'dog'], c: { d: 'dog' } },
      unlimited,
    )

    expect(result.replacementCount).toBe(4)
  })
})

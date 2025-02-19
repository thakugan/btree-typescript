B+ tree
=======

B+ trees are ordered collections of key-value pairs, sorted by key.

This is a fast B+ tree implementation, largely compatible with the standard Map, but with a much more diverse and powerful API. To use it, `import BTree from 'sorted-btree'`.

`BTree` is faster and/or uses less memory than other popular JavaScript sorted trees (see Benchmarks). However, data structures in JavaScript tend to be slower than the built-in `Array` and `Map` data structures in typical cases, because the built-in data structures are mostly implemented in a faster language such as C++. Even so, if you have a large amount of data that you want to keep sorted, the built-in data structures will not serve you well, and `BTree` offers features like fast cloning that the built-in types don't.

Use `npm install sorted-btree` in a terminal to install it in your npm-based project.

Features
--------

- Requires ES5 only (`Symbol.iterator` is not required but is used if defined.)
- Includes typings (`BTree` was written in TypeScript)
- API similar to ES6 `Map` with methods such as `size(), clear()`, 
  `forEach((v,k,tree)=>{}), get(K), set(K,V), has(K), delete(K)`,
  plus iterator functions `keys()`, `values()` and `entries()`.
- Supports keys that are numbers, strings, arrays of numbers/strings, `Date`,
  and objects that have a `valueOf()` method that returns a number or string.
- Other data types can also be supported with a custom comparator (second  
  constructor argument).
- Supports O(1) fast cloning with subtree sharing. This works by marking the
  root node as "shared between instances". This makes the tree read-only 
  with copy-on-edit behavior; both copies of the tree remain mutable.
  I call this category of data structure "dynamically persistent" because 
  AFAIK no one else has given it a name; it walks the line between mutating 
  and [persistent](https://en.wikipedia.org/wiki/Persistent_data_structure).
- Includes persistent methods such as `with` and `without`, which return a
  modified tree without changing the original (in O(log(size)) time).
- When a node fills up, items are shifted to siblings when possible to 
  keep nodes near their capacity, to improve memory utilization.
- Efficiently supports sets (keys without values). The collection does
  not allocate memory for values if the value `undefined` is associated 
  with all keys in a given node.
- Includes neat stuff such as `Range` methods for batch operations
- Throws an exception if you try to use `NaN` as a key, but infinity is allowed.
- No dependencies. 18K minified.
- Includes a lattice of interfaces for TypeScript users (see below)
- Supports diffing computation between two trees that is highly optimized for the case
  in which a majority of nodes are shared (such as when persistent methods are used).

### Additional operations supported on this B+ tree ###

- Set a value only if the key does not already exist: `t.setIfNotPresent(k,v)`
- Set a value only if the key already exists: `t.changeIfPresent(k,v)`
- Iterate in backward order: `for (pair of t.entriesReversed()) {}`
- Iterate from a particular first element: `for (let p of t.entries(first)) {}`
- Convert to an array: `t.toArray()`, `t.keysArray()`, `t.valuesArray()`
- Get pairs for a range of keys ([K,V][]): `t.getRange(loK, hiK, includeHi)`
- Delete a range of keys and their values: `t.deleteRange(loK, hiK, includeHi)`
- Scan all items: `t.forEachPair((key, value, index) => {...})`
- Scan a range of items: `t.forRange(lowKey, highKey, includeHiFlag, (k,v) => {...})`
- Count the number of keys in a range: `c = t.forRange(loK, hiK, includeHi, undefined)`
- Get smallest or largest key: `t.minKey()`, `t.maxKey()`
- Get next larger key/pair than `k`: `t.nextHigherKey(k)`, `t.nextHigherPair(k)`
- Get largest key/pair that is lower than `k`: `t.nextLowerKey(k)`, `t.nextLowerPair(k)`
- Freeze to prevent modifications: `t.freeze()` (you can also `t.unfreeze()`)
- Fast clone: `t.clone()`
- Compute a diff between two trees (quickly skipping shared subtrees): `t.diffAgainst(otherTree, ...)`
- For more information, **see [full documentation](https://github.com/qwertie/btree-typescript/blob/master/b%2Btree.ts) in the source code.**

**Note:** Confusingly, the ES6 `Map.forEach(c)` method calls `c(value,key)` instead of `c(key,value)`, in contrast to other methods such as `set()` and `entries()` which put the key first. I can only assume that they reversed the order on the hypothesis that users would usually want to examine values and ignore keys. BTree's `forEach()` therefore works the same way, but there is a second method `.forEachPair((key,value)=>{...})` which sends you the key first and the value second; this method is slightly faster because it is the "native" for-each method for this class.

**Note:** Duplicate keys are not allowed (supporting duplicates properly is complex).

The "scanning" methods (`forEach, forRange, editRange, deleteRange`) will normally return the number of elements that were scanned. However, the callback can return `{break:R}` to stop iterating early and return a value `R` from the scanning method.

#### Functional methods

- Get a copy of the tree including only items fitting a criteria: `t.filter((k,v) => k.fitsCriteria())`
- Get a copy of the tree with all values modified: `t.mapValues((v,k) => v.toString())`
- Reduce a tree (see below): `t.reduce((acc, pair) => acc+pair[1], 0)`

#### Persistent methods

- Get a new tree with one pair changed: `t.with(key, value)`
- Get a new tree with multiple pairs changed: `t.withPairs([[k1,v1], [k2,v2]])`
- Ensure that specified keys exist in a new tree: `t.withKeys([k1,k2])`
- Get a new tree with one pair removed: `t.without(key)`
- Get a new tree with specific pairs removed: `t.withoutKeys(keys)`
- Get a new tree with a range of keys removed: `t.withoutRange(low, high, includeHi)`

**Things to keep in mind:** I ran a test which suggested `t.with` is three times slower than `t.set`. These methods do not return a frozen tree even if the original tree was frozen (for performance reasons, e.g. frozen trees use slightly more memory.)

Examples
--------

### Custom comparator ###

Given a set of `{name: string, age: number}` objects, you can create a tree sorted by name and then by age like this:

~~~js
  // First constructor argument is an optional list of pairs ([K,V][])
  var tree = new BTree(undefined, (a, b) => {
    if (a.name > b.name)
      return 1; // Return a number >0 when a > b
    else if (a.name < b.name)
      return -1; // Return a number <0 when a < b
    else // names are equal (or incomparable)
      return a.age - b.age; // Return >0 when a.age > b.age
  });

  tree.set({name:"Bill", age:17}, "happy");
  tree.set({name:"Fran", age:40}, "busy & stressed");
  tree.set({name:"Bill", age:55}, "recently laid off");
  tree.forEachPair((k, v) => {
    console.log(`Name: ${k.name} Age: ${k.age} Status: ${v}`);
  });
~~~

### reduce ###

The `reduce` method performs a reduction operation, like the `reduce` method of `Array`. It is used to combine all keys, values or pairs into a single value, or to perform type conversions conversions. `reduce` is best understood by example. So here's how you can multiply all the keys in a tree together:

    var product = tree.reduce((p, pair) => p * pair[0], 1)

It means "start with `p=1`, and for each pair change `p` to `p * pair[0]`" (`pair[0]` is the key). You may be thinking "hey, wouldn't it make more sense if the `1` argument came _first_?" Yes it would, but in `Array` the parameter is second, so it must also be second in `BTree` for consistency.

Here's a similar example that adds all values together:

    var total = tree.reduce((sum, pair) => sum + pair[1], 0)

This final example converts the tree to a Map:

    var map = tree.reduce((m, pair) => m.set(pair[0], pair[1]), new Map())`

Remember that `m.set` returns `m`, which is different from `BTree` where `tree.set` returns a boolean indicating whether a new key was added.

### editRange ###

You can scan a range of items and selectively delete or change some of them using `t.editRange`. For example, the following code adds an exclamation mark to each non-boring value and deletes key number 4:

~~~js
var t = new BTree().setRange([[1,"fun"],[2,"yay"],[4,"whee"],[8,"zany"],[10,"boring"]);
t.editRange(t.minKey(), t.maxKey(), true, (k, v) => {
  if (k === 4) 
    return {delete: true};
  if (v !== "boring")
    return {value: v + '!'};
})
~~~

Interface lattice
-----------------

BTree includes a lattice of interface types representing subsets of BTree's interface. I would encourage other authors of map/dictionary/tree/hashtable types to utilize these interfaces. These interfaces can be divided along three dimensions:

### 1. Read/write access ###

I have defined several kinds of interfaces along the read/write access dimension:

- **Source**: A "source" is a read-only interface (`ISetSource<K>` and `IMapSource<K,V>`). At minimum, sources include a `size` property and methods `get`, `has`, `forEach`, and `keys`.
- **Sink**: A "sink" is a write-only interface (`ISetSink<K>` and `IMapSink<K,V>`). At minimum, sinks have `set`, `delete` and `clear` methods.
- **Mutable**: An interface that combines the source and sink interfaces (`ISet<K>` and `IMap<K,V>`).
- **Functional**: An interface for [persistent](https://en.wikipedia.org/wiki/Persistent_data_structure) data structures. It combines a read-only interface with methods that return a modified copy of the collection. The functional interfaces end with `F` (`ISetF<K>` and `IMapF<K,V>`).

### 2. Sorted versus unsorted ###

The `Sorted` interfaces extend the non-sorted interfaces with queries that only a sorted collection can perform efficiently, such as `minKey()` and `nextHigherKey(k)`. At minimum, sorted interfaces add methods `minKey`, `maxKey`, `nextHigherKey`, `nextLowerKey`, and `forRange`, plus iterators that return keys/values/pairs in sorted order and accept a `firstKey` parameter to control the starting point of iteration.

### 3. Set versus map ###

A map is a collection of keys with values, while a set is a collection of keys without values.

For the most part, each `Set` interface is a subset of the corresponding `Map` interface with "values" removed. For example, `MapF<K,V>` extends `SetF<K>`. An exception to this is that `IMapSink<K, V>` could not be derived from `ISetSink<K>` (and thus `IMap<K,V>` is not derived from `ISet<K>`) because the type `V` does not necessarily include `undefined`. Therefore you can write `set.set(key)` to add a key to a set, but you cannot write `map.set(key)` without specifying a value (in TypeScript this is true _even if `V` includes undefined_.)

### List of interfaces ###

All of these interfaces use `any` as the default type of `K` and `V`.

- `ISetSource<K>`
- `ISetSink<K>`
- `ISet<K>               extends ISetSource<K>, ISetSink<K>`
- `IMapSource<K, V>      extends ISetSource<K>`
- `IMapSink<K, V>`
- `IMap<K, V>            extends IMapSource<K,V>, IMapSink<K,V>`
- `ISortedSetSource<K>   extends ISetSource<K>`
- `ISortedSet<K>         extends ISortedSetSource<K>, ISetSink<K>`
- `ISortedMapSource<K,V> extends IMapSource<K, V>, ISortedSetSource<K>`
- `ISortedMap<K,V>       extends IMap<K,V>, ISortedMapSource<K,V>`
- `ISetF<K>              extends ISetSource<K>`
- `IMapF<K, V>           extends IMapSource<K,V>, ISetF<K>`
- `ISortedSetF<K>        extends ISetF<K>, ISortedSetSource<K>`
- `ISortedMapF<K,V>      extends ISortedSetF<K>, IMapF<K,V>, ISortedMapSource<K,V>`

If the lattice were complete there would be 16 interfaces (4*2*2). In fact there are only 14 interfaces because `ISortedMapSink<K,V>` and `ISortedSetSink<K, V>` don't exist, because sorted sinks are indistinguishable from unsorted sinks.

`BTree<K,V>` implements all of these interfaces except `ISetSink<K>`, `ISet<K>`, and `ISortedSet<K>`.

### ES6 Map/Set compatibility ###

The `IMap<K,V>` interface is compatible with the ES6 `Map<K,V>` type as well as `BTree<K,V>`. In order to accomplish this, compromises had to be made:

- The `set(k,v)` method returns `any` for compatibility with both `BTree` and `Map`, since `BTree` returns `boolean` (true if an item was added or false if it already existed), while `Map` returns `this`.
- ES6's `Map.forEach(c)` method calls `c(value,key)` instead of `c(key,value)`, unlike all other methods which put the key first. Therefore `IMap` works the same way. Unfortunately, this means that `ISetSource<K>`, the supertype of `IMapSource<K,V>`, cannot sanely have a `forEach` method because if it did, the first parameter to the callback would be unused.
- The batch operations `setPairs`, `deletePairs` and `reduce` are left out because they are not defined by `Map`. Instead, these methods are defined in `ISortedMap<K,V>`.
- Likewise, the functional operations `reduce`, `filter` and `mapValues` are not included in `IMap`, but they are defined in `IMapF<K,V>` and (except `mapValues`) `ISetF<K>`.

Similarly, `ISet<K>` is compatible with ES6 `Set`. Again there are compromises:

- The `set` method is renamed `add` in `Set` and `ISet<K>`, so `add` exists on `BTree.prototype` as a synonym for `set`.
- There is no `forEach` method for reasons alluded to above. Use `keys()` instead.
- There is no `filter` or `reduce` because `Set` doesn't support them.

Although `BTree<K,V>` doesn't directly implement `ISet<K>`, it does implement `ISetSource<K>` and it is safe to cast `BTree<K,V>` to `ISet<K>` or `ISortedSet<K>` provided that `V` is allowed to be undefined.

Benchmarks (in milliseconds for integer keys/values)
----------------------------------------------------

- These benchmark results were gathered on my PC in Node v10.4.1, July 2018
- `BTree` is 3 to 5 times faster than `SortedMap` and `SortedSet` in the `collections` package
- `BTree` has similar speed to `RBTree` at smaller sizes, but is faster at very large sizes and uses less memory because it packs many keys into one array instead of allocating an extra heap object for every key.
- If you need [functional persistence](https://en.wikipedia.org/wiki/Persistent_data_structure), `functional-red-black-tree` is remarkably fast for a persistent tree, but `BTree` should require less memory _unless_ you frequently use `clone/with/without` and are saving snapshots of the old tree to prevent garbage collection.
- B+ trees normally use less memory than hashtables (such as the standard `Map`), although in JavaScript this is not guaranteed because the B+ tree's memory efficiency depends on avoiding wasted space in the arrays for each node, and JavaScript provides no way to detect or control the capacity of an array's underlying memory area. Also, `Map` should be faster because it does not sort its keys.
- "Sorted array" refers to `SortedArray<K,V>`, a wrapper class for an array of `[K,V]` pairs. Benchmark results were not gathered for sorted arrays with one million elements (it takes too long)

### Insertions at random locations: sorted-btree vs the competition ###

    0.8     Insert 1000 pairs in sorted-btree's BTree
    0.4     Insert 1000 pairs in sorted-btree's BTree set (no values)
    2.5     Insert 1000 pairs in collections' SortedMap
    1.6     Insert 1000 pairs in collections' SortedSet (no values)
    0.7     Insert 1000 pairs in functional-red-black-tree
    0.5     Insert 1000 pairs in bintrees' RBTree (no values)

    8.6     Insert 10000 pairs in sorted-btree's BTree
    5.1     Insert 10000 pairs in sorted-btree's BTree set (no values)
    37.8    Insert 10000 pairs in collections' SortedMap
    25.8    Insert 10000 pairs in collections' SortedSet (no values)
    8.7     Insert 10000 pairs in functional-red-black-tree
    5.4     Insert 10000 pairs in bintrees' RBTree (no values)

    95.9    Insert 100000 pairs in sorted-btree's BTree
    69.1    Insert 100000 pairs in sorted-btree's BTree set (no values)
    564     Insert 100000 pairs in collections' SortedMap
    366.5   Insert 100000 pairs in collections' SortedSet (no values)
    192.5   Insert 100000 pairs in functional-red-black-tree
    107.3   Insert 100000 pairs in bintrees' RBTree (no values)

    1363    Insert 1000000 pairs in sorted-btree's BTree
    909     Insert 1000000 pairs in sorted-btree's BTree set (no values)
    8783    Insert 1000000 pairs in collections' SortedMap
    5443    Insert 1000000 pairs in collections' SortedSet (no values)
    3356    Insert 1000000 pairs in functional-red-black-tree
    1581    Insert 1000000 pairs in bintrees' RBTree (no values)

### Insert in order, delete: sorted-btree vs the competition ###

    0.6     Insert 1000 sorted pairs in B+ tree
    0.4     Insert 1000 sorted keys in B+ tree set (no values)
    0.6     Insert 1000 sorted pairs in collections' SortedMap
    0.4     Insert 1000 sorted keys in collections' SortedSet (no values)
    0.7     Insert 1000 sorted pairs in functional-red-black-tree
    0.5     Insert 1000 sorted keys in bintrees' RBTree (no values)
    1       Delete every second item in B+ tree
    3       Delete every second item in B+ tree set
    1       Bulk-delete every second item in B+ tree set
    1       Delete every second item in collections' SortedMap
    1       Delete every second item in collections' SortedSet
    5       Delete every second item in functional-red-black-tree
    10      Delete every second item in bintrees' RBTree

    6.5     Insert 10000 sorted pairs in B+ tree
    3.9     Insert 10000 sorted keys in B+ tree set (no values)
    6.5     Insert 10000 sorted pairs in collections' SortedMap
    3.9     Insert 10000 sorted keys in collections' SortedSet (no values)
    12.4    Insert 10000 sorted pairs in functional-red-black-tree
    5.8     Insert 10000 sorted keys in bintrees' RBTree (no values)
    4       Delete every second item in B+ tree
    4       Delete every second item in B+ tree set
    3       Bulk-delete every second item in B+ tree set
    13      Delete every second item in collections' SortedMap
    7       Delete every second item in collections' SortedSet
    8       Delete every second item in functional-red-black-tree
    6       Delete every second item in bintrees' RBTree

    75.9    Insert 100000 sorted pairs in B+ tree
    45      Insert 100000 sorted keys in B+ tree set (no values)
    98.7    Insert 100000 sorted pairs in collections' SortedMap
    61.4    Insert 100000 sorted keys in collections' SortedSet (no values)
    145.8   Insert 100000 sorted pairs in functional-red-black-tree
    82.6    Insert 100000 sorted keys in bintrees' RBTree (no values)
    79      Delete every second item in B+ tree
    52      Delete every second item in B+ tree set
    18      Bulk-delete every second item in B+ tree set
    166     Delete every second item in collections' SortedMap
    58      Delete every second item in collections' SortedSet
    64      Delete every second item in functional-red-black-tree
    74      Delete every second item in bintrees' RBTree

    700     Insert 1000000 sorted pairs in B+ tree
    452.5   Insert 1000000 sorted keys in B+ tree set (no values)
    1069    Insert 1000000 sorted pairs in collections' SortedMap
    864     Insert 1000000 sorted keys in collections' SortedSet (no values)
    1531    Insert 1000000 sorted pairs in functional-red-black-tree
    966     Insert 1000000 sorted keys in bintrees' RBTree (no values)
    435     Delete every second item in B+ tree
    291     Delete every second item in B+ tree set
    159     Bulk-delete every second item in B+ tree set
    1447    Delete every second item in collections' SortedMap
    796     Delete every second item in collections' SortedSet
    573     Delete every second item in functional-red-black-tree
    537     Delete every second item in bintrees' RBTree

### Insertions at random locations: sorted-btree vs Array vs Map ###

    0.5     Insert 1000 pairs in sorted array
    0.6     Insert 1000 pairs in B+ tree
    0.1     Insert 1000 pairs in ES6 Map (hashtable)

    13.2    Insert 10000 pairs in sorted array
    7.2     Insert 10000 pairs in B+ tree
    1.3     Insert 10000 pairs in ES6 Map (hashtable)

    56980   Insert 100000 pairs in sorted array
    122     Insert 100000 pairs in B+ tree
    17.7    Insert 100000 pairs in ES6 Map (hashtable)

    SLOW!   Insert 1000000 pairs in sorted array
    1354    Insert 1000000 pairs in B+ tree
    304.5   Insert 1000000 pairs in ES6 Map (hashtable)

### Insert in order, scan, delete: sorted-btree vs Array vs Map ###

    0.4     Insert 1000 sorted pairs in array
    0.6     Insert 1000 sorted pairs in B+ tree
    0.1     Insert 1000 sorted pairs in Map hashtable
    0       Sum of all values with forEach in sorted array: 27350180
    0       Sum of all values with forEachPair in B+ tree: 27350180
    0       Sum of all values with forEach in B+ tree: 27350180
    0       Sum of all values with iterator in B+ tree: 27350180
    0       Sum of all values with forEach in Map: 27350180
    0.1     Delete every second item in sorted array
    0.1     Delete every second item in B+ tree
    0       Delete every second item in Map hashtable

    3.9     Insert 10000 sorted pairs in array
    6.7     Insert 10000 sorted pairs in B+ tree
    1.3     Insert 10000 sorted pairs in Map hashtable
    0.2     Sum of all values with forEach in sorted array: 2716659330
    0.3     Sum of all values with forEachPair in B+ tree: 2716659330
    0.4     Sum of all values with forEach in B+ tree: 2716659330
    0.3     Sum of all values with iterator in B+ tree: 2716659330
    0.2     Sum of all values with forEach in Map: 2716659330
    1.2     Delete every second item in sorted array
    1.1     Delete every second item in B+ tree
    0.3     Delete every second item in Map hashtable

    68.4    Insert 100000 sorted pairs in array
    72.7    Insert 100000 sorted pairs in B+ tree
    18.4    Insert 100000 sorted pairs in Map hashtable
    2.5     Sum of all values with forEach in sorted array: 275653049020
    3.3     Sum of all values with forEachPair in B+ tree: 275653049020
    4.5     Sum of all values with forEach in B+ tree: 275653049020
    2.8     Sum of all values with iterator in B+ tree: 275653049020
    2.2     Sum of all values with forEach in Map: 275653049020
    2420    Delete every second item in sorted array
    14.4    Delete every second item in B+ tree
    3.7     Delete every second item in Map hashtable

    969     Insert 1000000 sorted pairs in array
    773     Insert 1000000 sorted pairs in B+ tree
    305.5   Insert 1000000 sorted pairs in Map hashtable
    25.3    Sum of all values with forEach in sorted array: 27510295368690
    32.4    Sum of all values with forEachPair in B+ tree: 27510295368690
    46.1    Sum of all values with forEach in B+ tree: 27510295368690
    29.9    Sum of all values with iterator in B+ tree: 27510295368690
    22      Sum of all values with forEach in Map: 27510295368690
    SLOW!   Delete every second item in sorted array
    305.5   Delete every second item in B+ tree
    95.6    Delete every second item in Map hashtable

Version history
---------------

### v1.5.0 ###

- Added `BTree.diffAgainst` method (PR #16)
- Added `simpleComparator` function (PR #15)
- Improved `defaultComparator` (PR #15) to support edge cases better. Most notably, heterogenous key types will no longer cause trouble such as failure to find keys that are, in fact, present in the tree. `BTree` is slightly slower using the new default comparator, but the benchmarks above have not been refreshed. For maximum performance, use `simpleComparator` or a custom comparator as the second constructor parameter. The simplest possible comparator is `(a, b) => a - b`, which works for finite numbers only.

### v1.4.0 ###

- Now built as CommonJS module instead of UMD module, for better compatibility with webpack. No semantic change.

### v1.3.0 ###

- Now built with TypeScript v3.8.3. No semantic change.

### v1.2.4 ###

- Issue #9 fixed: `nextLowerPair(0)` was being treated like `nextLowerPair(undefined)`, and `nextLowerPair(undefined)` was returning the second-highest pair when it should have returned the highest pair.

### v1.2.3 ###

- Important bug fix in deletion code avoids occasional tree corruption that can occur after a series of delete operations
- Add `typings` option in package.json so that `tsc` works for end-users

### v1.2 ###

- Added a complete lattice of interfaces as described above.
- Interfaces have been moved to a separate *interfaces.d.ts* file which is re-exported by the main module in *b+tree.d.ts*.

### v1.1 ###

- Added `isEmpty` property getter
- Added `nextHigherPair`, `nextHigherKey`, `nextLowerPair`, `nextLowerKey` methods
- Added `editAll`, which is like `editRange` but touches all keys
- Added `deleteKeys` for deleting a sequence of keys (iterable)
- Added persistent methods `with`, `withPairs`, `withKeys`, `without`, `withoutKeys`, `withoutRange`
- Added functional methods `filter`, `reduce`, `mapValues`
- Added `greedyClone` for cloning nodes immediately, to avoid marking the original tree as shared which slows it down.
- Relaxed type constraint on second parameter of `entries`/`entriesReversed`
- Renamed `setRange` to `setPairs` for logical consistency with `withoutPairs` and `withoutRange`. The old name is deprecated but added to the `prototype` as a synonym. `setPairs` returns the number of pairs added instead of `this`.
- Added export `EmptyBTree`, a frozen empty tree

### v1.0: Initial version ###

- With fast cloning and all that good stuff


### Endnote ###

♥ This package was made to help people [learn TypeScript & React](http://typescript-react-primer.loyc.net/).

Are you a C# developer? You might like the similar data structures I made for C# ([BDictionary, BList, etc.](core.loyc.net/collections/alists-part2)), and other [dynamically persistent collection types](http://core.loyc.net/collections/).

You might think that the package name "sorted btree" is overly redundant, but I _did_ make a data structure similar to B+ Tree that is _not_ sorted. I called it the [A-List](http://core.loyc.net/collections/alists-part1) (C#). But yeah, the names `btree` and `bplustree` were already taken, so what was I supposed to do, right?

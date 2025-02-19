import { ISortedMap, ISortedMapF } from './interfaces';
export { ISetSource, ISetSink, ISet, ISetF, ISortedSetSource, ISortedSet, ISortedSetF, IMapSource, IMapSink, IMap, IMapF, ISortedMapSource, ISortedMap, ISortedMapF } from './interfaces';
export declare type EditRangeResult<V, R = number> = {
    value?: V;
    break?: R;
    delete?: boolean;
};
/**
 * Types that BTree supports by default
 */
export declare type DefaultComparable = number | string | Date | boolean | null | undefined | (number | string)[] | {
    valueOf: () => number | string | Date | boolean | null | undefined | (number | string)[];
};
/**
 * Compares DefaultComparables to form a strict partial ordering.
 *
 * Handles +/-0 and NaN like Map: NaN is equal to NaN, and -0 is equal to +0.
 *
 * Arrays are compared using '<' and '>', which may cause unexpected equality:
 * for example [1] will be considered equal to ['1'].
 *
 * Two objects with equal valueOf compare the same, but compare unequal to
 * primitives that have the same value.
 */
export declare function defaultComparator(a: DefaultComparable, b: DefaultComparable): number;
/**
 * Compares items using the < and > operators. This function is probably slightly
 * faster than the defaultComparator for Dates and strings, but has not been benchmarked.
 * Unlike defaultComparator, this comparator doesn't support mixed types correctly,
 * i.e. use it with `BTree<string>` or `BTree<number>` but not `BTree<string|number>`.
 *
 * NaN is not supported.
 *
 * Note: null is treated like 0 when compared with numbers or Date, but in general
 *   null is not ordered with respect to strings (neither greater nor less), and
 *   undefined is not ordered with other types.
 */
export declare function simpleComparator(a: string, b: string): number;
export declare function simpleComparator(a: number | null, b: number | null): number;
export declare function simpleComparator(a: Date | null, b: Date | null): number;
export declare function simpleComparator(a: (number | string)[], b: (number | string)[]): number;
/**
 * A reasonably fast collection of key-value pairs with a powerful API.
 * Largely compatible with the standard Map. BTree is a B+ tree data structure,
 * so the collection is sorted by key.
 *
 * B+ trees tend to use memory more efficiently than hashtables such as the
 * standard Map, especially when the collection contains a large number of
 * items. However, maintaining the sort order makes them modestly slower:
 * O(log size) rather than O(1). This B+ tree implementation supports O(1)
 * fast cloning. It also supports freeze(), which can be used to ensure that
 * a BTree is not changed accidentally.
 *
 * Confusingly, the ES6 Map.forEach(c) method calls c(value,key) instead of
 * c(key,value), in contrast to other methods such as set() and entries()
 * which put the key first. I can only assume that the order was reversed on
 * the theory that users would usually want to examine values and ignore keys.
 * BTree's forEach() therefore works the same way, but a second method
 * `.forEachPair((key,value)=>{...})` is provided which sends you the key
 * first and the value second; this method is slightly faster because it is
 * the "native" for-each method for this class.
 *
 * Out of the box, BTree supports keys that are numbers, strings, arrays of
 * numbers/strings, Date, and objects that have a valueOf() method returning a
 * number or string. Other data types, such as arrays of Date or custom
 * objects, require a custom comparator, which you must pass as the second
 * argument to the constructor (the first argument is an optional list of
 * initial items). Symbols cannot be used as keys because they are unordered
 * (one Symbol is never "greater" or "less" than another).
 *
 * @example
 * Given a {name: string, age: number} object, you can create a tree sorted by
 * name and then by age like this:
 *
 *     var tree = new BTree(undefined, (a, b) => {
 *       if (a.name > b.name)
 *         return 1; // Return a number >0 when a > b
 *       else if (a.name < b.name)
 *         return -1; // Return a number <0 when a < b
 *       else // names are equal (or incomparable)
 *         return a.age - b.age; // Return >0 when a.age > b.age
 *     });
 *
 *     tree.set({name:"Bill", age:17}, "happy");
 *     tree.set({name:"Fran", age:40}, "busy & stressed");
 *     tree.set({name:"Bill", age:55}, "recently laid off");
 *     tree.forEachPair((k, v) => {
 *       console.log(`Name: ${k.name} Age: ${k.age} Status: ${v}`);
 *     });
 *
 * @description
 * The "range" methods (`forEach, forRange, editRange`) will return the number
 * of elements that were scanned. In addition, the callback can return {break:R}
 * to stop early and return R from the outer function.
 *
 * - TODO: Test performance of preallocating values array at max size
 * - TODO: Add fast initialization when a sorted array is provided to constructor
 *
 * For more documentation see https://github.com/qwertie/btree-typescript
 *
 * Are you a C# developer? You might like the similar data structures I made for C#:
 * BDictionary, BList, etc. See http://core.loyc.net/collections/
 *
 * @author David Piepgrass
 */
export default class BTree<K = any, V = any> implements ISortedMapF<K, V>, ISortedMap<K, V> {
    private _root;
    _size: number;
    _maxNodeSize: number;
    /**
     * provides a total order over keys (and a strict partial order over the type K)
     * @returns a negative value if a < b, 0 if a === b and a positive value if a > b
     */
    _compare: (a: K, b: K) => number;
    /**
     * Initializes an empty B+ tree.
     * @param compare Custom function to compare pairs of elements in the tree.
     *   If not specified, defaultComparator will be used which is valid as long as K extends DefaultComparable.
     * @param entries A set of key-value pairs to initialize the tree
     * @param maxNodeSize Branching factor (maximum items or children per node)
     *   Must be in range 4..256. If undefined or <4 then default is used; if >256 then 256.
     */
    constructor(entries?: [K, V][], compare?: (a: K, b: K) => number, maxNodeSize?: number);
    /** Gets the number of key-value pairs in the tree. */
    get size(): number;
    /** Gets the number of key-value pairs in the tree. */
    get length(): number;
    /** Returns true iff the tree contains no key-value pairs. */
    get isEmpty(): boolean;
    /** Releases the tree so that its size is 0. */
    clear(): void;
    forEach(callback: (v: V, k: K, tree: BTree<K, V>) => void, thisArg?: any): number;
    /** Runs a function for each key-value pair, in order from smallest to
     *  largest key. The callback can return {break:R} (where R is any value
     *  except undefined) to stop immediately and return R from forEachPair.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return {break:R} to stop early with result R.
     *        The reason that you must return {break:R} instead of simply R
     *        itself is for consistency with editRange(), which allows
     *        multiple actions, not just breaking.
     * @param initialCounter This is the value of the third argument of
     *        `onFound` the first time it is called. The counter increases
     *        by one each time `onFound` is called. Default value: 0
     * @returns the number of pairs sent to the callback (plus initialCounter,
     *        if you provided one). If the callback returned {break:R} then
     *        the R value is returned instead. */
    forEachPair<R = number>(callback: (k: K, v: V, counter: number) => {
        break?: R;
    } | void, initialCounter?: number): R | number;
    /**
     * Finds a pair in the tree and returns the associated value.
     * @param defaultValue a value to return if the key was not found.
     * @returns the value, or defaultValue if the key was not found.
     * @description Computational complexity: O(log size)
     */
    get(key: K, defaultValue?: V): V | undefined;
    /**
     * Adds or overwrites a key-value pair in the B+ tree.
     * @param key the key is used to determine the sort order of
     *        data in the tree.
     * @param value data to associate with the key (optional)
     * @param overwrite Whether to overwrite an existing key-value pair
     *        (default: true). If this is false and there is an existing
     *        key-value pair then this method has no effect.
     * @returns true if a new key-value pair was added.
     * @description Computational complexity: O(log size)
     * Note: when overwriting a previous entry, the key is updated
     * as well as the value. This has no effect unless the new key
     * has data that does not affect its sort order.
     */
    set(key: K, value: V, overwrite?: boolean): boolean;
    /**
     * Returns true if the key exists in the B+ tree, false if not.
     * Use get() for best performance; use has() if you need to
     * distinguish between "undefined value" and "key not present".
     * @param key Key to detect
     * @description Computational complexity: O(log size)
     */
    has(key: K): boolean;
    /**
     * Removes a single key-value pair from the B+ tree.
     * @param key Key to find
     * @returns true if a pair was found and removed, false otherwise.
     * @description Computational complexity: O(log size)
     */
    delete(key: K): boolean;
    /** Returns a copy of the tree with the specified key set (the value is undefined). */
    with(key: K): BTree<K, V | undefined>;
    /** Returns a copy of the tree with the specified key-value pair set. */
    with<V2>(key: K, value: V2, overwrite?: boolean): BTree<K, V | V2>;
    /** Returns a copy of the tree with the specified key-value pairs set. */
    withPairs<V2>(pairs: [K, V | V2][], overwrite: boolean): BTree<K, V | V2>;
    /** Returns a copy of the tree with the specified keys present.
     *  @param keys The keys to add. If a key is already present in the tree,
     *         neither the existing key nor the existing value is modified.
     *  @param returnThisIfUnchanged if true, returns this if all keys already
     *  existed. Performance note: due to the architecture of this class, all
     *  node(s) leading to existing keys are cloned even if the collection is
     *  ultimately unchanged.
    */
    withKeys(keys: K[], returnThisIfUnchanged?: boolean): BTree<K, V | undefined>;
    /** Returns a copy of the tree with the specified key removed.
     * @param returnThisIfUnchanged if true, returns this if the key didn't exist.
     *  Performance note: due to the architecture of this class, node(s) leading
     *  to where the key would have been stored are cloned even when the key
     *  turns out not to exist and the collection is unchanged.
     */
    without(key: K, returnThisIfUnchanged?: boolean): BTree<K, V>;
    /** Returns a copy of the tree with the specified keys removed.
     * @param returnThisIfUnchanged if true, returns this if none of the keys
     *  existed. Performance note: due to the architecture of this class,
     *  node(s) leading to where the key would have been stored are cloned
     *  even when the key turns out not to exist.
     */
    withoutKeys(keys: K[], returnThisIfUnchanged?: boolean): BTree<K, V>;
    /** Returns a copy of the tree with the specified range of keys removed. */
    withoutRange(low: K, high: K, includeHigh: boolean, returnThisIfUnchanged?: boolean): BTree<K, V>;
    /** Returns a copy of the tree with pairs removed whenever the callback
     *  function returns false. `where()` is a synonym for this method. */
    filter(callback: (k: K, v: V, counter: number) => boolean, returnThisIfUnchanged?: boolean): BTree<K, V>;
    /** Returns a copy of the tree with all values altered by a callback function. */
    mapValues<R>(callback: (v: V, k: K, counter: number) => R): BTree<K, R>;
    /** Performs a reduce operation like the `reduce` method of `Array`.
     *  It is used to combine all pairs into a single value, or perform
     *  conversions. `reduce` is best understood by example. For example,
     *  `tree.reduce((P, pair) => P * pair[0], 1)` multiplies all keys
     *  together. It means "start with P=1, and for each pair multiply
     *  it by the key in pair[0]". Another example would be converting
     *  the tree to a Map (in this example, note that M.set returns M):
     *
     *  var M = tree.reduce((M, pair) => M.set(pair[0],pair[1]), new Map())
     *
     *  **Note**: the same array is sent to the callback on every iteration.
     */
    reduce<R>(callback: (previous: R, currentPair: [K, V], counter: number, tree: BTree<K, V>) => R, initialValue: R): R;
    reduce<R>(callback: (previous: R | undefined, currentPair: [K, V], counter: number, tree: BTree<K, V>) => R): R | undefined;
    /** Returns an iterator that provides items in order (ascending order if
     *  the collection's comparator uses ascending order, as is the default.)
     *  @param lowestKey First key to be iterated, or undefined to start at
     *         minKey(). If the specified key doesn't exist then iteration
     *         starts at the next higher key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     */
    entries(lowestKey?: K, reusedArray?: (K | V)[]): IterableIterator<[K, V]>;
    /** Returns an iterator that provides items in reversed order.
     *  @param highestKey Key at which to start iterating, or undefined to
     *         start at maxKey(). If the specified key doesn't exist then iteration
     *         starts at the next lower key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     *  @param skipHighest Iff this flag is true and the highestKey exists in the
     *         collection, the pair matching highestKey is skipped, not iterated.
     */
    entriesReversed(highestKey?: K, reusedArray?: (K | V)[], skipHighest?: boolean): IterableIterator<[K, V]>;
    private findPath;
    /**
     * Computes the differences between `this` and `other`.
     * For efficiency, the diff is returned via invocations of supplied handlers.
     * The computation is optimized for the case in which the two trees have large amounts
     * of shared data (obtained by calling the `clone` or `with` APIs) and will avoid
     * any iteration of shared state.
     * The handlers can cause computation to early exit by returning {break: R}.
     * Neither of the collections should be changed during the comparison process (in your callbacks), as this method assumes they will not be mutated.
     * @param other The tree to compute a diff against.
     * @param onlyThis Callback invoked for all keys only present in `this`.
     * @param onlyOther Callback invoked for all keys only present in `other`.
     * @param different Callback invoked for all keys with differing values.
     */
    diffAgainst<R>(other: BTree<K, V>, onlyThis?: (k: K, v: V) => {
        break?: R;
    } | void, onlyOther?: (k: K, v: V) => {
        break?: R;
    } | void, different?: (k: K, vThis: V, vOther: V) => {
        break?: R;
    } | void): R | undefined;
    private static finishCursorWalk;
    private static stepToEnd;
    private static makeDiffCursor;
    /**
     * Advances the cursor to the next step in the walk of its tree.
     * Cursors are walked backwards in sort order, as this allows them to leverage maxKey() in order to be compared in O(1).
     * @param cursor The cursor to step
     * @param stepToNode If true, the cursor will be advanced to the next node (skipping values)
     * @returns true if the step was completed and false if the step would have caused the cursor to move beyond the end of the tree.
     */
    private static step;
    /**
     * Compares the two cursors. Returns a value indicating which cursor is ahead in a walk.
     * Note that cursors are advanced in reverse sorting order.
     */
    private static compare;
    /** Returns a new iterator for iterating the keys of each pair in ascending order.
     *  @param firstKey: Minimum key to include in the output. */
    keys(firstKey?: K): IterableIterator<K>;
    /** Returns a new iterator for iterating the values of each pair in order by key.
     *  @param firstKey: Minimum key whose associated value is included in the output. */
    values(firstKey?: K): IterableIterator<V>;
    /** Returns the maximum number of children/values before nodes will split. */
    get maxNodeSize(): number;
    /** Gets the lowest key in the tree. Complexity: O(log size) */
    minKey(): K | undefined;
    /** Gets the highest key in the tree. Complexity: O(1) */
    maxKey(): K | undefined;
    /** Quickly clones the tree by marking the root node as shared.
     *  Both copies remain editable. When you modify either copy, any
     *  nodes that are shared (or potentially shared) between the two
     *  copies are cloned so that the changes do not affect other copies.
     *  This is known as copy-on-write behavior, or "lazy copying". */
    clone(): BTree<K, V>;
    /** Performs a greedy clone, immediately duplicating any nodes that are
     *  not currently marked as shared, in order to avoid marking any nodes
     *  as shared.
     *  @param force Clone all nodes, even shared ones.
     */
    greedyClone(force?: boolean): BTree<K, V>;
    /** Gets an array filled with the contents of the tree, sorted by key */
    toArray(maxLength?: number): [K, V][];
    /** Gets an array of all keys, sorted */
    keysArray(): K[];
    /** Gets an array of all values, sorted by key */
    valuesArray(): V[];
    /** Gets a string representing the tree's data based on toArray(). */
    toString(): string;
    /** Stores a key-value pair only if the key doesn't already exist in the tree.
     * @returns true if a new key was added
    */
    setIfNotPresent(key: K, value: V): boolean;
    /** Returns the next pair whose key is larger than the specified key (or undefined if there is none).
     *  If key === undefined, this function returns the lowest pair.
     */
    nextHigherPair(key: K | undefined): [K, V] | undefined;
    /** Returns the next key larger than the specified key (or undefined if there is none) */
    nextHigherKey(key: K | undefined): K | undefined;
    /** Returns the next pair whose key is smaller than the specified key (or undefined if there is none).
     *  If key === undefined, this function returns the highest pair.
     */
    nextLowerPair(key: K | undefined): [K, V] | undefined;
    /** Returns the next key smaller than the specified key (or undefined if there is none) */
    nextLowerKey(key: K | undefined): K | undefined;
    /** Edits the value associated with a key in the tree, if it already exists.
     * @returns true if the key existed, false if not.
    */
    changeIfPresent(key: K, value: V): boolean;
    /**
     * Builds an array of pairs from the specified range of keys, sorted by key.
     * Each returned pair is also an array: pair[0] is the key, pair[1] is the value.
     * @param low The first key in the array will be greater than or equal to `low`.
     * @param high This method returns when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, its pair will be included
     *        in the output if and only if this parameter is true. Note: if the
     *        `low` key is present, it is always included in the output.
     * @param maxLength Length limit. getRange will stop scanning the tree when
     *                  the array reaches this size.
     * @description Computational complexity: O(result.length + log size)
     */
    getRange(low: K, high: K, includeHigh?: boolean, maxLength?: number): [K, V][];
    /** Adds all pairs from a list of key-value pairs.
     * @param pairs Pairs to add to this tree. If there are duplicate keys,
     *        later pairs currently overwrite earlier ones (e.g. [[0,1],[0,7]]
     *        associates 0 with 7.)
     * @param overwrite Whether to overwrite pairs that already exist (if false,
     *        pairs[i] is ignored when the key pairs[i][0] already exists.)
     * @returns The number of pairs added to the collection.
     * @description Computational complexity: O(pairs.length * log(size + pairs.length))
     */
    setPairs(pairs: [K, V][], overwrite?: boolean): number;
    forRange(low: K, high: K, includeHigh: boolean, onFound?: (k: K, v: V, counter: number) => void, initialCounter?: number): number;
    /**
     * Scans and potentially modifies values for a subsequence of keys.
     * Note: the callback `onFound` should ideally be a pure function.
     *   Specfically, it must not insert items, call clone(), or change
     *   the collection except via return value; out-of-band editing may
     *   cause an exception or may cause incorrect data to be sent to
     *   the callback (duplicate or missed items). It must not cause a
     *   clone() of the collection, otherwise the clone could be modified
     *   by changes requested by the callback.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, `onFound` is called for
     *        that final pair if and only if this parameter is true.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return `{value:v}` to change the value associated
     *        with the current key, `{delete:true}` to delete the current pair,
     *        `{break:R}` to stop early with result R, or it can return nothing
     *        (undefined or {}) to cause no effect and continue iterating.
     *        `{break:R}` can be combined with one of the other two commands.
     *        The third argument `counter` is the number of items iterated
     *        previously; it equals 0 when `onFound` is called the first time.
     * @returns The number of values scanned, or R if the callback returned
     *        `{break:R}` to stop early.
     * @description
     *   Computational complexity: O(number of items scanned + log size)
     *   Note: if the tree has been cloned with clone(), any shared
     *   nodes are copied before `onFound` is called. This takes O(n) time
     *   where n is proportional to the amount of shared data scanned.
     */
    editRange<R = V>(low: K, high: K, includeHigh: boolean, onFound: (k: K, v: V, counter: number) => EditRangeResult<V, R> | void, initialCounter?: number): R | number;
    /** Same as `editRange` except that the callback is called for all pairs. */
    editAll<R = V>(onFound: (k: K, v: V, counter: number) => EditRangeResult<V, R> | void, initialCounter?: number): R | number;
    /**
     * Removes a range of key-value pairs from the B+ tree.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh Specifies whether the `high` key, if present, is deleted.
     * @returns The number of key-value pairs that were deleted.
     * @description Computational complexity: O(log size + number of items deleted)
     */
    deleteRange(low: K, high: K, includeHigh: boolean): number;
    /** Deletes a series of keys from the collection. */
    deleteKeys(keys: K[]): number;
    /** Gets the height of the tree: the number of internal nodes between the
     *  BTree object and its leaf nodes (zero if there are no internal nodes). */
    get height(): number;
    /** Makes the object read-only to ensure it is not accidentally modified.
     *  Freezing does not have to be permanent; unfreeze() reverses the effect.
     *  This is accomplished by replacing mutator functions with a function
     *  that throws an Error. Compared to using a property (e.g. this.isFrozen)
     *  this implementation gives better performance in non-frozen BTrees.
     */
    freeze(): void;
    /** Ensures mutations are allowed, reversing the effect of freeze(). */
    unfreeze(): void;
    /** Returns true if the tree appears to be frozen. */
    get isFrozen(): boolean;
    /** Scans the tree for signs of serious bugs (e.g. this.size doesn't match
     *  number of elements, internal nodes not caching max element properly...)
     *  Computational complexity: O(number of nodes), i.e. O(size). This method
     *  skips the most expensive test - whether all keys are sorted - but it
     *  does check that maxKey() of the children of internal nodes are sorted. */
    checkValid(): void;
}
/** A BTree frozen in the empty state. */
export declare const EmptyBTree: BTree<any, any>;


// @ts-check

interface Identifiable {

	readonly id: string;
}

/**
 * A map that is optimized for Identifiable objects.
 */
class Collection<T extends Identifiable> extends Map<string, T> {

	constructor();
	constructor(it: Iterable<readonly [string, T]>);

	constructor(it?: Iterable<readonly [string, T]>)  { super(it); }

	push(value) {

		if(!value.id) {

			throw new Error("this value must have an 'id' property");
		}

		this.set(value.id, value);
	}

	find(fn) {

		for(const [key, value] of this) {
			
			if(fn(value, key, this)) { return value; }
		}

		return null;
	}

	/**
	 * Creates a Collection from an array of objects that have an `id` property.
	 *
	 * @template A
	 *
	 * @param {A extends Identifiable[]} array
	 *
	 * @returns {Collection<A>}
	 */
	static from<A extends Identifiable>(array: A): Collection<A> {

		if(!Array.isArray(array)) {

			throw new Error("an array must be provided");
		}

		var col = new Collection<A>();

		array.forEach((value) => {

			if(!value.id) {

				throw new Error("all values of this array must have an 'id' property");
			}

			col.set(value.id, value);
		});

		return col;
	}
}

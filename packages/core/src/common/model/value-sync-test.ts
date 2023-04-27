import * as assert from 'assert';
import {describe, it} from 'mocha';

import {Point2d} from '../../input-binding/point-2d/model/point-2d.js';
import {Constraint} from '../constraint/constraint.js';
import {connectValues} from './value-sync.js';
import {createValue} from './values.js';

describe(connectValues.name, () => {
	it('should set initial value', () => {
		const pv = createValue(new Point2d(1, 2));
		const sv = createValue(0);
		connectValues({
			primary: pv,
			secondary: sv,

			forward: (p) => {
				return p.x;
			},
			backward: (p, s) => {
				const comps = p.getComponents();
				comps[0] = s;
				return new Point2d(...comps);
			},
		});
		assert.strictEqual(sv.rawValue, 1);
	});

	it('should apply constraint of primary value', () => {
		class TestConstraint implements Constraint<Point2d> {
			constrain(): Point2d {
				// Secondary value will be changed by constraint of primary value
				return new Point2d(-1, -1);
			}
		}

		const pv = createValue(new Point2d(1, 2), {
			constraint: new TestConstraint(),
		});

		const sv = createValue(0);
		connectValues({
			primary: pv,
			secondary: sv,

			forward: (p) => p.x,
			backward: (p, s) => {
				const comps = p.getComponents();
				comps[0] = s;
				return new Point2d(...comps);
			},
		});

		// Try to change secondary value
		sv.rawValue = 10;
		// ...and it should be updated by primary constraint

		assert.strictEqual(sv.rawValue, -1);
	});
});

import * as assert from 'assert';
import {describe, it} from 'mocha';

import {Value} from '../../../common/model/value';
import {ValueMap} from '../../../common/model/value-map';
import {createValue} from '../../../common/model/values';
import {ViewProps} from '../../../common/model/view-props';
import {CheckboxController} from '../../../input-binding/boolean/controller/checkbox';
import {createTestWindow} from '../../../misc/dom-test-util';
import {forceCast} from '../../../misc/type-util';
import {createDefaultPluginPool} from '../../../plugin/plugins';
import {BindingApi} from '../../binding/api/binding';
import {LabeledValueController} from '../../label/controller/value-label';
import {LabelPropsObject} from '../../label/view/label';
import {TestValueBladeApi, TestValueBladePlugin} from '../../test-util';
import {RackController} from '../controller/rack';
import {createBlade} from '../model/blade';
import {RackApi} from './rack';

function createApi(opt_doc?: Document) {
	const doc = opt_doc ?? createTestWindow().document;
	const c = new RackController({
		blade: createBlade(),
		element: doc.createElement('div'),
		viewProps: ViewProps.create(),
	});

	const pool = createDefaultPluginPool();
	pool.register(TestValueBladePlugin);

	return new RackApi(c, pool);
}

describe(RackApi.name, () => {
	it('should handle global input events', (done) => {
		const api = createApi();
		const obj = {foo: 1};
		const bapi = api.addBinding(obj, 'foo');

		api.on('change', (ev) => {
			assert.strictEqual((ev.target as BindingApi).key, 'foo');
			assert.strictEqual(ev.target, bapi);
			assert.strictEqual(ev.value, 2);
			done();
		});

		const value: Value<number> = forceCast(bapi['controller_'].value);
		value.rawValue += 1;
	});

	it('should handle global input events (nested)', (done) => {
		const api = createApi();
		const obj = {foo: 1};
		const fapi = api.addFolder({
			title: 'foo',
		});
		const bapi = fapi.addBinding(obj, 'foo');

		api.on('change', (ev) => {
			assert.strictEqual((ev.target as BindingApi).key, 'foo');
			assert.strictEqual(ev.target, bapi);
			assert.strictEqual(ev.value, 2);
			done();
		});

		const value: Value<number> = forceCast(bapi['controller_'].value);
		value.rawValue += 1;
	});

	it('should handle global value events', (done) => {
		const doc = createTestWindow().document;
		const api = createApi(doc);
		const v = createValue<boolean>(false);
		const c = new LabeledValueController<boolean, CheckboxController>(doc, {
			blade: createBlade(),
			props: ValueMap.fromObject<LabelPropsObject>({
				label: '',
			}),
			value: v,
			valueController: new CheckboxController(doc, {
				value: v,
				viewProps: ViewProps.create(),
			}),
		});
		const bapi = new TestValueBladeApi(c);
		api.add(bapi);

		api.on('change', (ev) => {
			assert.strictEqual(ev.target, bapi);
			assert.strictEqual(ev.value, true);
			done();
		});

		bapi.value = true;
	});

	it('should not handle removed child events', () => {
		const api = createApi();

		let count = 0;
		api.on('change', () => {
			count += 1;
		});

		const item = api.addBinding({foo: 0}, 'foo');
		(item['controller_'].value as Value<number>).rawValue += 1;
		api.remove(item);
		(item['controller_'].value as Value<number>).rawValue += 1;
		assert.strictEqual(count, 1);
	});
});
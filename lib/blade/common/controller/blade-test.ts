import * as assert from 'assert';
import {describe, it} from 'mocha';

import {createViewProps} from '../../../common/model/view-props';
import {View} from '../../../common/view/view';
import {TestUtil} from '../../../misc/test-util';
import {Blade} from '../model/blade';
import {BladeController} from './blade';

class TestView implements View {
	public readonly element: HTMLElement;

	constructor(doc: Document) {
		this.element = doc.createElement('div');
	}

	onDispose() {}
}

class TestController extends BladeController<TestView> {
	constructor(doc: Document) {
		super({
			blade: new Blade(),
			view: new TestView(doc),
			viewProps: createViewProps(),
		});
	}
}

describe(BladeController.name, () => {
	it('should apply view position', () => {
		const doc = TestUtil.createWindow().document;
		const c = new TestController(doc);
		const [m, v] = [c.blade, c.view];
		assert.strictEqual(v.element.classList.contains('tp-v-fst'), false);
		assert.strictEqual(v.element.classList.contains('tp-v-lst'), false);
		m.positions = ['first'];
		assert.strictEqual(v.element.classList.contains('tp-v-fst'), true);
		m.positions = ['last'];
		assert.strictEqual(v.element.classList.contains('tp-v-fst'), false);
		assert.strictEqual(v.element.classList.contains('tp-v-lst'), true);
		m.positions = ['first', 'last'];
		assert.strictEqual(v.element.classList.contains('tp-v-fst'), true);
		assert.strictEqual(v.element.classList.contains('tp-v-lst'), true);
	});

	it('should apply disposed', () => {
		const doc = TestUtil.createWindow().document;
		const c = new TestController(doc);
		const v = c.view;

		const parentElem = doc.createElement('div');
		parentElem.appendChild(v.element);

		assert.notStrictEqual(v.element.parentNode, null);
		c.viewProps.set('disposed', true);
		assert.strictEqual(v.element.parentNode, null);
	});
});

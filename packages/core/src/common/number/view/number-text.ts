import {SVG_NS} from '../../../common/dom-util.js';
import {Value, ValueEvents} from '../../../common/model/value.js';
import {ValueMap} from '../../../common/model/value-map.js';
import {ViewProps} from '../../../common/model/view-props.js';
import {ClassName} from '../../../common/view/class-name.js';
import {InputView, View} from '../../../common/view/view.js';
import {Formatter} from '../../converter/formatter.js';
import {constrainRange} from '../util.js';

export type NumberTextPropsObject = {
	formatter: Formatter<number>;
	keyScale: number;
	pointerScale: number;
};

/**
 * @hidden
 */
export type NumberTextProps = ValueMap<NumberTextPropsObject>;

/**
 * @hidden
 */
interface NumberConfig {
	dragging: Value<number | null>;
	props: NumberTextProps;
	value: Value<number>;
	viewProps: ViewProps;

	arrayPosition?: 'fst' | 'mid' | 'lst';
}

const cn = ClassName('txt');

/**
 * @hidden
 */
export class NumberTextView implements View, InputView {
	public readonly inputElement: HTMLInputElement;
	public readonly knobElement: HTMLElement;
	public readonly element: HTMLElement;
	public readonly value: Value<number>;
	private readonly props_: NumberTextProps;
	private readonly dragging_: Value<number | null>;
	private readonly guideBodyElem_: SVGPathElement;
	private readonly guideHeadElem_: SVGPathElement;
	private readonly tooltipElem_: HTMLElement;

	constructor(doc: Document, config: NumberConfig) {
		this.onChange_ = this.onChange_.bind(this);

		this.props_ = config.props;
		this.props_.emitter.on('change', this.onChange_);

		this.element = doc.createElement('div');
		this.element.classList.add(cn(), cn(undefined, 'num'));
		if (config.arrayPosition) {
			this.element.classList.add(cn(undefined, config.arrayPosition));
		}
		config.viewProps.bindClassModifiers(this.element);

		const inputElem = doc.createElement('input');
		inputElem.classList.add(cn('i'));
		inputElem.type = 'text';
		config.viewProps.bindDisabled(inputElem);
		this.element.appendChild(inputElem);
		this.inputElement = inputElem;

		this.onDraggingChange_ = this.onDraggingChange_.bind(this);

		this.dragging_ = config.dragging;
		this.dragging_.emitter.on('change', this.onDraggingChange_);

		this.element.classList.add(cn());
		this.inputElement.classList.add(cn('i'));

		const knobElem = doc.createElement('div');
		knobElem.classList.add(cn('k'));
		this.element.appendChild(knobElem);
		this.knobElement = knobElem;

		const guideElem = doc.createElementNS(SVG_NS, 'svg');
		guideElem.classList.add(cn('g'));
		this.knobElement.appendChild(guideElem);

		const bodyElem = doc.createElementNS(SVG_NS, 'path');
		bodyElem.classList.add(cn('gb'));
		guideElem.appendChild(bodyElem);
		this.guideBodyElem_ = bodyElem;

		const headElem = doc.createElementNS(SVG_NS, 'path');
		headElem.classList.add(cn('gh'));
		guideElem.appendChild(headElem);
		this.guideHeadElem_ = headElem;

		const tooltipElem = doc.createElement('div');
		tooltipElem.classList.add(ClassName('tt')());
		this.knobElement.appendChild(tooltipElem);
		this.tooltipElem_ = tooltipElem;

		config.value.emitter.on('change', this.onChange_);
		this.value = config.value;

		this.refresh();
	}

	private onDraggingChange_(ev: ValueEvents<number | null>['change']) {
		if (ev.rawValue === null) {
			this.element.classList.remove(cn(undefined, 'drg'));
			return;
		}

		this.element.classList.add(cn(undefined, 'drg'));

		const x = ev.rawValue / this.props_.get('pointerScale');
		const aox = x + (x > 0 ? -1 : x < 0 ? +1 : 0);
		const adx = constrainRange(-aox, -4, +4);
		this.guideHeadElem_.setAttributeNS(
			null,
			'd',
			[`M ${aox + adx},0 L${aox},4 L${aox + adx},8`, `M ${x},-1 L${x},9`].join(
				' ',
			),
		);
		this.guideBodyElem_.setAttributeNS(null, 'd', `M 0,4 L${x},4`);

		const formatter = this.props_.get('formatter');
		this.tooltipElem_.textContent = formatter(this.value.rawValue);
		this.tooltipElem_.style.left = `${x}px`;
	}

	public refresh(): void {
		const formatter = this.props_.get('formatter');
		this.inputElement.value = formatter(this.value.rawValue);
	}

	private onChange_(): void {
		this.refresh();
	}
}

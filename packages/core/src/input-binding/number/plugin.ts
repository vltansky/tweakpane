import {InputBindingController} from '../../blade/binding/controller/input-binding';
import {ListInputBindingApi} from '../../common/api/list';
import {
	CompositeConstraint,
	findConstraint,
} from '../../common/constraint/composite';
import {Constraint} from '../../common/constraint/constraint';
import {DefiniteRangeConstraint} from '../../common/constraint/definite-range';
import {ListConstraint} from '../../common/constraint/list';
import {ListController} from '../../common/controller/list';
import {Formatter} from '../../common/converter/formatter';
import {
	createNumberFormatter,
	numberFromUnknown,
	parseNumber,
} from '../../common/converter/number';
import {createListConstraint, parseListOptions} from '../../common/list-util';
import {MicroParser, parseRecord} from '../../common/micro-parsers';
import {ValueMap} from '../../common/model/value-map';
import {NumberTextController} from '../../common/number/controller/number-text';
import {SliderTextController} from '../../common/number/controller/slider-text';
import {
	createRangeConstraint,
	createStepConstraint,
	getBaseStep,
	getSuitableDecimalDigits,
	getSuitableDraggingScale,
} from '../../common/number/util';
import {BaseInputParams, ListParamsOptions} from '../../common/params';
import {writePrimitive} from '../../common/primitive';
import {VERSION} from '../../version';
import {InputBindingPlugin} from '../plugin';
import {SliderInputBindingApi} from './api/slider';

export interface NumberInputParams extends BaseInputParams {
	format?: Formatter<number>;
	max?: number;
	min?: number;
	options?: ListParamsOptions<number>;
	step?: number;
}

function createConstraint(
	params: NumberInputParams,
	initialValue: number,
): Constraint<number> {
	const constraints: Constraint<number>[] = [];

	const sc = createStepConstraint(params, initialValue);
	if (sc) {
		constraints.push(sc);
	}
	const rc = createRangeConstraint(params);
	if (rc) {
		constraints.push(rc);
	}
	const lc = createListConstraint<number>(params.options);
	if (lc) {
		constraints.push(lc);
	}

	return new CompositeConstraint(constraints);
}

/**
 * @hidden
 */
export const NumberInputPlugin: InputBindingPlugin<
	number,
	number,
	NumberInputParams
> = {
	id: 'input-number',
	type: 'input',
	core: VERSION,
	accept: (value, params) => {
		if (typeof value !== 'number') {
			return null;
		}
		const result = parseRecord<NumberInputParams>(params, (p) => ({
			format: p.optional.function as MicroParser<Formatter<number>>,
			max: p.optional.number,
			min: p.optional.number,
			options: p.optional.custom<ListParamsOptions<number>>(parseListOptions),
			readonly: p.optional.constant(false),
			step: p.optional.number,
		}));
		return result
			? {
					initialValue: value,
					params: result,
			  }
			: null;
	},
	binding: {
		reader: (_args) => numberFromUnknown,
		constraint: (args) => createConstraint(args.params, args.initialValue),
		writer: (_args) => writePrimitive,
	},
	controller: (args) => {
		const value = args.value;
		const c = args.constraint;

		const lc = c && findConstraint<ListConstraint<number>>(c, ListConstraint);
		if (lc) {
			return new ListController(args.document, {
				props: new ValueMap({
					options: lc.values.value('options'),
				}),
				value: value,
				viewProps: args.viewProps,
			});
		}

		const formatter =
			args.params.format ??
			createNumberFormatter(getSuitableDecimalDigits(c, value.rawValue));

		const drc = c && findConstraint(c, DefiniteRangeConstraint);
		if (drc) {
			return new SliderTextController(args.document, {
				baseStep: getBaseStep(c),
				parser: parseNumber,
				sliderProps: new ValueMap({
					max: drc.values.value('max'),
					min: drc.values.value('min'),
				}),
				textProps: ValueMap.fromObject({
					draggingScale: getSuitableDraggingScale(c, value.rawValue),
					formatter: formatter,
				}),
				value: value,
				viewProps: args.viewProps,
			});
		}

		return new NumberTextController(args.document, {
			baseStep: getBaseStep(c),
			parser: parseNumber,
			props: ValueMap.fromObject({
				draggingScale: getSuitableDraggingScale(c, value.rawValue),
				formatter: formatter,
			}),
			value: value,
			viewProps: args.viewProps,
		});
	},
	api(args) {
		if (typeof args.controller.value.rawValue !== 'number') {
			return null;
		}

		if (args.controller.valueController instanceof SliderTextController) {
			return new SliderInputBindingApi(
				args.controller as InputBindingController<number, SliderTextController>,
			);
		}
		if (args.controller.valueController instanceof ListController) {
			return new ListInputBindingApi(
				args.controller as InputBindingController<
					number,
					ListController<number>
				>,
			);
		}

		return null;
	},
};

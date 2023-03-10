import {Constraint} from '../../common/constraint/constraint';
import {
	createNumberFormatter,
	parseNumber,
} from '../../common/converter/number';
import {parseRecord} from '../../common/micro-parsers';
import {ValueMap} from '../../common/model/value-map';
import {
	findNumberRange,
	getBaseStep,
	getSuitableDecimalDigits,
	getSuitableDraggingScale,
} from '../../common/number/util';
import {
	BaseInputParams,
	PickerLayout,
	PointDimensionParams,
} from '../../common/params';
import {parsePickerLayout} from '../../common/picker-util';
import {parsePointDimensionParams} from '../../common/point-nd-util';
import {createDimensionConstraint} from '../../common/point-nd-util';
import {isEmpty} from '../../misc/type-util';
import {VERSION} from '../../version';
import {PointNdConstraint} from '../common/constraint/point-nd';
import {InputBindingPlugin} from '../plugin';
import {Point2dController} from './controller/point-2d';
import {point2dFromUnknown, writePoint2d} from './converter/point-2d';
import {Point2d, Point2dAssembly, Point2dObject} from './model/point-2d';

interface Point2dYParams extends PointDimensionParams {
	inverted?: boolean;
}

export interface Point2dInputParams
	extends BaseInputParams,
		PointDimensionParams {
	expanded?: boolean;
	picker?: PickerLayout;
	x?: PointDimensionParams;
	y?: Point2dYParams;
}

function createConstraint(
	params: Point2dInputParams,
	initialValue: Point2dObject,
): Constraint<Point2d> {
	return new PointNdConstraint({
		assembly: Point2dAssembly,
		components: [
			createDimensionConstraint(
				{
					...params,
					...params.x,
				},
				initialValue.x,
			),
			createDimensionConstraint(
				{
					...params,
					...params.y,
				},
				initialValue.y,
			),
		],
	});
}

function getSuitableMaxDimensionValue(
	constraint: Constraint<number> | undefined,
	rawValue: number,
): number {
	const [min, max] = constraint ? findNumberRange(constraint) : [];
	if (!isEmpty(min) || !isEmpty(max)) {
		return Math.max(Math.abs(min ?? 0), Math.abs(max ?? 0));
	}

	const step = getBaseStep(constraint);
	return Math.max(Math.abs(step) * 10, Math.abs(rawValue) * 10);
}

export function getSuitableMax(
	initialValue: Point2d,
	constraint: Constraint<Point2d> | undefined,
): number {
	const xc =
		constraint instanceof PointNdConstraint
			? constraint.components[0]
			: undefined;
	const yc =
		constraint instanceof PointNdConstraint
			? constraint.components[1]
			: undefined;
	const xr = getSuitableMaxDimensionValue(xc, initialValue.x);
	const yr = getSuitableMaxDimensionValue(yc, initialValue.y);
	return Math.max(xr, yr);
}

function createAxis(
	initialValue: number,
	constraint: Constraint<number> | undefined,
) {
	return {
		baseStep: getBaseStep(constraint),
		constraint: constraint,
		textProps: ValueMap.fromObject({
			draggingScale: getSuitableDraggingScale(constraint, initialValue),
			formatter: createNumberFormatter(
				getSuitableDecimalDigits(constraint, initialValue),
			),
		}),
	};
}

function shouldInvertY(params: Point2dInputParams): boolean {
	if (!('y' in params)) {
		return false;
	}

	const yParams = params.y;
	if (!yParams) {
		return false;
	}

	return 'inverted' in yParams ? !!yParams.inverted : false;
}

/**
 * @hidden
 */
export const Point2dInputPlugin: InputBindingPlugin<
	Point2d,
	Point2dObject,
	Point2dInputParams
> = {
	id: 'input-point2d',
	type: 'input',
	core: VERSION,
	accept: (value, params) => {
		if (!Point2d.isObject(value)) {
			return null;
		}
		const result = parseRecord<Point2dInputParams>(params, (p) => ({
			expanded: p.optional.boolean,
			max: p.optional.number,
			min: p.optional.number,
			picker: p.optional.custom(parsePickerLayout),
			readonly: p.optional.constant(false),
			step: p.optional.number,
			x: p.optional.custom(parsePointDimensionParams),
			y: p.optional.object<Point2dYParams & Record<string, unknown>>({
				inverted: p.optional.boolean,
				max: p.optional.number,
				min: p.optional.number,
				step: p.optional.number,
			}),
		}));
		return result
			? {
					initialValue: value,
					params: result,
			  }
			: null;
	},
	binding: {
		reader: () => point2dFromUnknown,
		constraint: (args) => createConstraint(args.params, args.initialValue),
		equals: Point2d.equals,
		writer: () => writePoint2d,
	},
	controller: (args) => {
		const doc = args.document;
		const value = args.value;
		const c = args.constraint as PointNdConstraint<Point2d>;
		return new Point2dController(doc, {
			axes: [
				createAxis(value.rawValue.x, c.components[0]),
				createAxis(value.rawValue.y, c.components[1]),
			],
			expanded: args.params.expanded ?? false,
			invertsY: shouldInvertY(args.params),
			max: getSuitableMax(value.rawValue, c),
			parser: parseNumber,
			pickerLayout: args.params.picker ?? 'popup',
			value: value,
			viewProps: args.viewProps,
		});
	},
};

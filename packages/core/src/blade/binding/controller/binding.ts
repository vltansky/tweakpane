import {
	BindingValue,
	isBindingValue,
} from '../../../common/binding/value/binding';
import {ValueController} from '../../../common/controller/value';
import {LabeledValueController} from '../../label/controller/value-label';

export type BindingController<In> = LabeledValueController<
	In,
	ValueController<In>,
	BindingValue<In>
>;

export function isBindingController(
	c: unknown,
): c is BindingController<unknown> {
	return c instanceof LabeledValueController && isBindingValue(c.value);
}
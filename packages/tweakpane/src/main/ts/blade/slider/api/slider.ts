import {
	ApiChangeEvents,
	BladeApi,
	Emitter,
	LabeledValueBladeController,
	SliderTextController,
	TpChangeEvent,
} from '@tweakpane/core';

export class SliderBladeApi extends BladeApi<
	LabeledValueBladeController<number, SliderTextController>
> {
	private readonly emitter_: Emitter<ApiChangeEvents<number>> = new Emitter();

	/**
	 * @hidden
	 */
	constructor(
		controller: LabeledValueBladeController<number, SliderTextController>,
	) {
		super(controller);

		this.controller_.value.emitter.on('change', (ev) => {
			this.emitter_.emit('change', new TpChangeEvent(this, ev.rawValue));
		});
	}

	get label(): string | null | undefined {
		return this.controller_.labelController.props.get('label');
	}

	set label(label: string | null | undefined) {
		this.controller_.labelController.props.set('label', label);
	}

	get max(): number {
		return this.controller_.valueController.sliderController.props.get('max');
	}

	set max(max: number) {
		this.controller_.valueController.sliderController.props.set('max', max);
	}

	get min(): number {
		return this.controller_.valueController.sliderController.props.get('min');
	}

	set min(min: number) {
		this.controller_.valueController.sliderController.props.set('min', min);
	}

	get value(): number {
		return this.controller_.value.rawValue;
	}

	set value(value: number) {
		this.controller_.value.rawValue = value;
	}

	public on<EventName extends keyof ApiChangeEvents<number>>(
		eventName: EventName,
		handler: (ev: ApiChangeEvents<number>[EventName]) => void,
	): this {
		const bh = handler.bind(this);
		this.emitter_.on(eventName, (ev) => {
			bh(ev);
		});
		return this;
	}
}

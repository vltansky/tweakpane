import {PluginPool} from '../../../plugin/pool.js';
import {ContainerBladeController} from '../controller/container-blade.js';
import {BladeApi} from './blade.js';
import {RackApi} from './rack.js';

export class ContainerBladeApi<
	C extends ContainerBladeController,
> extends BladeApi<C> {
	/**
	 * @hidden
	 */
	protected readonly rackApi_: RackApi;

	/**
	 * @hidden
	 */
	constructor(controller: C, pool: PluginPool) {
		super(controller);

		this.rackApi_ = new RackApi(controller.rackController, pool);
	}
}

export function isContainerBladeApi(
	api: BladeApi,
): api is ContainerBladeApi<ContainerBladeController> {
	return 'rackApi_' in api;
}

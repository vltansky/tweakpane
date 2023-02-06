import {BindingApi} from '../blade/binding/api/binding';
import {InputBindingApi} from '../blade/binding/api/input-binding';
import {MonitorBindingApi} from '../blade/binding/api/monitor-binding';
import {isBindingController} from '../blade/binding/controller/binding';
import {InputBindingController} from '../blade/binding/controller/input-binding';
import {MonitorBindingController} from '../blade/binding/controller/monitor-binding';
import {BladeApi} from '../blade/common/api/blade';
import {InputParams, MonitorParams} from '../blade/common/api/params';
import {BladeController} from '../blade/common/controller/blade';
import {BladePlugin, createBladeController} from '../blade/plugin';
import {RackApi} from '../blade/rack/api/rack';
import {RackController} from '../blade/rack/controller/rack';
import {BindingTarget} from '../common/binding/target';
import {TpError} from '../common/tp-error';
import {
	createInputBindingController,
	InputBindingPlugin,
} from '../input-binding/plugin';
import {isEmpty} from '../misc/type-util';
import {
	createMonitorBindingController,
	MonitorBindingPlugin,
} from '../monitor-binding/plugin';
import {TpPlugin} from './plugins';

/**
 * @hidden
 */
export class PluginPool {
	private readonly pluginsMap_: {
		blades: BladePlugin<any>[];
		inputs: InputBindingPlugin<any, any, any>[];
		monitors: MonitorBindingPlugin<any, any>[];
	} = {
		blades: [],
		inputs: [],
		monitors: [],
	};

	public getAll(): TpPlugin[] {
		return [
			...this.pluginsMap_.blades,
			...this.pluginsMap_.inputs,
			...this.pluginsMap_.monitors,
		];
	}

	public register(r: TpPlugin): void {
		if (r.type === 'blade') {
			this.pluginsMap_.blades.unshift(r);
		} else if (r.type === 'input') {
			this.pluginsMap_.inputs.unshift(r);
		} else if (r.type === 'monitor') {
			this.pluginsMap_.monitors.unshift(r);
		}
	}

	public createInput(
		document: Document,
		target: BindingTarget,
		params: InputParams,
	): InputBindingController<unknown> {
		const initialValue = target.read();

		if (isEmpty(initialValue)) {
			throw new TpError({
				context: {
					key: target.key,
				},
				type: 'nomatchingcontroller',
			});
		}

		const bc = this.pluginsMap_.inputs.reduce(
			(result: InputBindingController<unknown> | null, plugin) =>
				result ??
				createInputBindingController(plugin, {
					document: document,
					target: target,
					params: params,
					presetKey: params.presetKey,
				}),
			null,
		);
		if (bc) {
			return bc;
		}

		throw new TpError({
			context: {
				key: target.key,
			},
			type: 'nomatchingcontroller',
		});
	}

	public createMonitor(
		document: Document,
		target: BindingTarget,
		params: MonitorParams,
	): MonitorBindingController<unknown> {
		const bc = this.pluginsMap_.monitors.reduce(
			(result: MonitorBindingController<unknown> | null, plugin) =>
				result ??
				createMonitorBindingController(plugin, {
					document: document,
					params: params,
					target: target,
				}),
			null,
		);
		if (bc) {
			return bc;
		}

		throw new TpError({
			context: {
				key: target.key,
			},
			type: 'nomatchingcontroller',
		});
	}

	public createBlade(
		document: Document,
		params: Record<string, unknown>,
	): BladeController {
		const bc = this.pluginsMap_.blades.reduce(
			(result: BladeController | null, plugin) =>
				result ??
				createBladeController(plugin, {
					document: document,
					params: params,
				}),
			null,
		);
		if (!bc) {
			throw new TpError({
				type: 'nomatchingview',
				context: {
					params: params,
				},
			});
		}
		return bc;
	}

	public createBladeApi(bc: BladeController): BladeApi {
		if (isBindingController(bc)) {
			return new BindingApi(bc);
		}
		if (bc instanceof RackController) {
			return new RackApi(bc, this);
		}

		const api = this.pluginsMap_.blades.reduce(
			(result: BladeApi | null, plugin) =>
				result ??
				plugin.api({
					controller: bc,
					pool: this,
				}),
			null,
		);
		if (!api) {
			throw TpError.shouldNeverHappen();
		}
		return api;
	}

	public createInputBindingApi<In, Ex>(
		bc: InputBindingController<In>,
	): InputBindingApi<In, Ex> {
		const api = this.pluginsMap_.inputs.reduce(
			(result: InputBindingApi<In, Ex> | null, plugin) => {
				if (result) {
					return result;
				}
				return (
					plugin.api?.({
						controller: bc as InputBindingController<unknown>,
					}) ?? null
				);
			},
			null,
		);
		return api ?? new BindingApi(bc);
	}

	public createMonitorBindingApi<T>(
		bc: MonitorBindingController<T>,
	): MonitorBindingApi<T> {
		const api = this.pluginsMap_.monitors.reduce(
			(result: MonitorBindingApi<T> | null, plugin) => {
				if (result) {
					return result;
				}
				return (
					plugin.api?.({
						controller: bc as MonitorBindingController<unknown>,
					}) ?? null
				);
			},
			null,
		);
		return api ?? new BindingApi(bc);
	}
}

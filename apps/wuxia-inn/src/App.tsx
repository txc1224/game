import { useEffect, useRef, useState } from 'react';
import {
  newInn,
  tick,
  hireStaff,
  learnRecipe,
  completeOrder,
  availableOrders,
  staffList,
  recipeList,
  incomePerSec,
  serializeInn,
  deserializeInn,
  type InnState,
} from '@game/inn-core';

const SAVE_KEY = 'wuxia-inn:save';

function loadInn(): InnState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = deserializeInn(raw);
      if (parsed) {
        // 结算离线收益
        tick(parsed);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return newInn();
}

export default function App() {
  const [state, setState] = useState<InnState>(loadInn);
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = (next: InnState) => {
    setState({ ...next });
    try {
      localStorage.setItem(SAVE_KEY, serializeInn(next));
    } catch {
      // ignore
    }
  };

  // 每秒结算一次在线收益
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = stateRef.current;
      tick(s);
      setState({ ...s });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // 定时落盘
  useEffect(() => {
    const t = window.setInterval(() => {
      try {
        localStorage.setItem(SAVE_KEY, serializeInn(stateRef.current));
      } catch {
        // ignore
      }
    }, 5000);
    return () => window.clearInterval(t);
  }, []);

  const income = incomePerSec(state);
  const orders = availableOrders(state);
  const staffs = staffList(state);
  const recipes = recipeList(state);

  return (
    <div className="inn-shell">
      <h1 className="inn-title serif">悦来客栈</h1>
      <p className="inn-subtitle">武侠经营 · 一间客栈 · 一段江湖</p>

      {/* 柜台:银两/口碑/等级/产出 */}
      <div className="card counter-card">
        <div className="counter-row">
          <div className="counter-cell">
            <span className="counter-k">银两</span>
            <span className="counter-v silver">{state.silver < 1000 ? state.silver.toFixed(1) : Math.floor(state.silver)} 两</span>
          </div>
          <div className="counter-cell">
            <span className="counter-k">口碑</span>
            <span className="counter-v">{state.renown}</span>
          </div>
          <div className="counter-cell">
            <span className="counter-k">客栈</span>
            <span className="counter-v">{state.level} 级</span>
          </div>
          <div className="counter-cell">
            <span className="counter-k">进账</span>
            <span className="counter-v income">+{income.toFixed(1)}/秒</span>
          </div>
        </div>
      </div>

      <div className="inn-grid">
        {/* 左:伙计 + 菜谱 */}
        <div className="inn-col">
          <div className="card">
            <h3 className="section-title serif">雇佣伙计</h3>
            <div className="item-list">
              {staffs.map(({ staff, hired, affordable }) => (
                <div key={staff.id} className={`item-row ${hired ? 'done' : ''}`}>
                  <div className="item-body">
                    <div className="item-name">{staff.name} <em className="item-tag">{staff.role}</em></div>
                    <div className="item-desc">{staff.desc} <span className="item-effect">+{staff.income}/秒</span></div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={hired || !affordable}
                    onClick={() => { if (hireStaff(state, staff.id)) commit(state); }}
                  >
                    {hired ? '已雇' : `${staff.cost} 两`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-title serif">研习菜谱</h3>
            <div className="item-list">
              {recipes.map(({ recipe, learned, affordable }) => (
                <div key={recipe.id} className={`item-row ${learned ? 'done' : ''}`}>
                  <div className="item-body">
                    <div className="item-name">{recipe.name}</div>
                    <div className="item-desc">{recipe.desc} <span className="item-effect">口碑 +{recipe.renown}</span></div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={learned || !affordable}
                    onClick={() => { if (learnRecipe(state, recipe.id)) commit(state); }}
                  >
                    {learned ? '已研' : `${recipe.cost} 两`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右:门派订单 + 经营日志 */}
        <div className="inn-col">
          <div className="card">
            <h3 className="section-title serif">门派订单</h3>
            {orders.length === 0 ? (
              <div className="muted" style={{ padding: '12px 0' }}>
                {state.ordersDone.length > 0 ? '现有订单已全部办妥。提升口碑,会引来更大的主顾。' : '口碑尚浅,暂无大主顾。先研菜谱打响名号吧。'}
              </div>
            ) : (
              <div className="item-list">
                {orders.map((o) => (
                  <div key={o.id} className="item-row order-row">
                    <div className="item-body">
                      <div className="item-name">{o.sect}</div>
                      <div className="item-desc">{o.desc}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => { if (completeOrder(state, o.id)) commit(state); }}
                    >
                      承办 {o.reward} 两
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="section-title serif">经营日志</h3>
            <div className="inn-log">
              {[...state.log].reverse().slice(0, 30).map((l, i) => (
                <div key={i} className={`inn-log-line log-${l.kind}`}>{l.text}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="inn-footer">离线也有收益(封顶 8 小时) · 数据存于你的浏览器</footer>
    </div>
  );
}

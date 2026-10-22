import { peso } from '../money';

export default function DishButton({ dish, count, flashSeq, onTap }) {
  return (
    <button
      className="dish-btn"
      style={{ '--dish-color': dish.color }}
      onPointerDown={() => onTap(dish)}
    >
      {flashSeq > 0 && <span key={flashSeq} className="tap-flash" />}
      {count > 0 && <span className="count-badge">×{count}</span>}
      <span className="dish-name">{dish.name}</span>
      <span className="dish-price">{peso(dish.price_cents)}</span>
      {dish.description && <span className="dish-desc">{dish.description}</span>}
    </button>
  );
}

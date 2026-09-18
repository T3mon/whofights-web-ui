import { useTranslation } from "react-i18next";
import "./PromotionSidebar.css";
import PromotionTree, { type PromotionTreeProps } from "./PromotionTree";

export default function PromotionSidebar(props: PromotionTreeProps) {
  const { t } = useTranslation();
  return (
    <div className="promotion-sidebar">
      <div className="promotion-sidebar-title-row">
        <h2 className="promotion-sidebar-title">{t("sidebar.promotions")}</h2>
      </div>
      <PromotionTree {...props} />
    </div>
  );
}

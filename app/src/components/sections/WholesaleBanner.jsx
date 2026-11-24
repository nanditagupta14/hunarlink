import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBadgeCheck, IconChat, IconFile, IconLog, IconMapPin, IconTruck } from '../../components/LineIcons.jsx';

/* The B2B strip at the foot of the storefront. Both buttons go to the same
   trade portal, as they did in the static build. */

export default function WholesaleBanner() {
  const navigate = useNavigate();

  return (
    <section className="b2b-section" id="b2b-wholesale-section">
      <div className="container">
        <div className="b2b-banner-card">
          <div className="b2b-left">
            <span className="b2b-pill">
              <IconBadgeCheck size={16} />&#65039; B2B Hospitality &amp; Architectural Trade Portal
            </span>
            <h2 className="b2b-title">
              Bespoke Valley Lots for Luxury Hospitality &amp; Interior Architects
            </h2>
            <p className="b2b-desc">
              Source authenticated Kashmiri silk carpets, carved walnut architectural screens, and
              heirloom textiles at direct guild pricing. Dedicated craft concierges manage custom
              dimensions, MOQ lot scheduling, and export-ready GI compliance certificates.
            </p>
            <div className="b2b-perks-row">
              <span><IconMapPin size={15} /> Direct Cluster Sourcing</span>
              <span><IconLog size={15} /> Batch GI Certification</span>
              <span><IconTruck size={14} /> Global Insured Freight</span>
            </div>
          </div>

          <div className="b2b-right-actions">
            <button
              type="button"
              className="btn-white-solid"
              id="request-wholesale-btn"
              onClick={() => navigate('/wholesale')}
            >
              <IconFile size={15} /> Request Wholesale Catalog
            </button>
            <button
              type="button"
              className="btn-outline-dark"
              id="trade-concierge-btn"
              style={{ textAlign: 'center', justifyContent: 'center' }}
              onClick={() => navigate('/wholesale')}
            >
              <IconChat size={15} /> Speak to Trade Concierge
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
